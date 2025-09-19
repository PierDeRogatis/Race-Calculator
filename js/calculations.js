export function calculateSingleSplitTime(basePace, splitData, splitProgress, sliders) {
    const { distance, gain, loss } = splitData;
    const { pacing, uphill, downhill, temp } = sliders;
    if (distance <= 0) return 0;
    let pace = basePace * (1 - (pacing * 0.02) * (1 - 2 * splitProgress));
    let terrainMultiplier = 1.0;
    if (gain > 0) terrainMultiplier *= Math.pow(1.0 + ((gain / (distance * 1000)) * 100) / 10, 1.8 - (uphill * 0.05));
    if (loss > 0) {
        const slope = Math.atan(loss / (distance * 1000)) * (180 / Math.PI);
        const maxBenefit = 8.0 - (downhill * 0.4), neutral = 14.0 - (downhill * 0.4);
        if (slope <= maxBenefit) terrainMultiplier *= 1 - 0.25 * (slope / maxBenefit);
        else if (slope <= neutral) terrainMultiplier *= 0.75 + 0.25 * ((slope - maxBenefit) / (neutral - maxBenefit));
        else terrainMultiplier *= 1.0 + (slope - neutral) * 0.05;
    }
    pace *= terrainMultiplier;
    pace *= 1 + Math.pow(splitProgress, 2) * 0.15;
    if (temp > 28) pace *= 1 + (temp - 28) * 0.01;
    if (temp < 5) pace *= 1 + (5 - temp) * 0.005;
    return distance * pace;
}

export function calculateTotalTimeForPace(basePace, checkpointData, sliders) {
    let totalTime = 0, cumulativeDistance = 0;
    const totalDistance = checkpointData.reduce((acc, curr) => acc + curr.distance, 0);
    if (totalDistance <= 0) return 0;
    for (const split of checkpointData) {
        totalTime += calculateSingleSplitTime(basePace, split, cumulativeDistance / totalDistance, sliders);
        cumulativeDistance += split.distance;
    }
    return totalTime;
}

export function findBestPaceForTargetTime(targetTimeInMinutes, checkpointData, sliders) {
    let basePace = 7.0; const iterations = 20;
    for (let i = 0; i < iterations; i++) {
        const calculatedTime = calculateTotalTimeForPace(basePace, checkpointData, sliders);
        if (Math.abs(calculatedTime - targetTimeInMinutes) < 0.01) break;
        if (calculatedTime > 0) basePace *= targetTimeInMinutes / calculatedTime; else { basePace = 10; break; }
    }
    return basePace;
}

export function generatePlanFromPace(basePace, checkpointData, sliders, userPreferences, dom, currentPlan, currentlyEditingPlanId, savedPlansCache) {
    const { temp } = sliders;
    let carbsPerHour, waterPerHour, sodiumPerHour;
    const fitness = userPreferences.fitness || 'intermediate';
    switch (fitness) {
        case 'beginner': carbsPerHour = 40; break;
        case 'intermediate': carbsPerHour = 60; break;
        case 'advanced': carbsPerHour = 75; break;
        case 'elite': carbsPerHour = 90; break;
        default: carbsPerHour = 60;
    }
    const sweat = userPreferences.sweat || 'average';
    switch (sweat) {
        case 'low': waterPerHour = 500; sodiumPerHour = 350; break;
        case 'average': waterPerHour = 700; sodiumPerHour = 500; break;
        case 'high': waterPerHour = 900; sodiumPerHour = 750; break;
        default: waterPerHour = 700; sodiumPerHour = 500;
    }
    const TEMP_BASELINE = 15;
    dom.resultsBody.innerHTML = '';
    let totalTime = 0, totalCarbs = 0, totalWater = 0, totalSalts = 0, totalGain = 0, totalLoss = 0, totalDistance = 0, cumulativeDistance = 0;
    let splits = [];
    const tempDelta = temp - TEMP_BASELINE;
    const waterMultiplier = 1 + (tempDelta * 0.05);
    const sodiumMultiplier = 1 + (tempDelta * 0.06);
    let carbsMultiplier = tempDelta < 0 ? 1 + (-tempDelta * 0.015) : 1.0;
    const courseTotalDistance = checkpointData.reduce((acc, curr) => acc + curr.distance, 0);
    if (courseTotalDistance <= 0) return;
    for (const [i, splitData] of checkpointData.entries()) {
        const splitProgress = cumulativeDistance / courseTotalDistance;
        const splitTime = calculateSingleSplitTime(basePace, splitData, splitProgress, sliders);
        const splitPace = splitData.distance > 0 ? splitTime / splitData.distance : 0;
        const splitTimeHours = splitTime / 60;
        const splitCarbs = Math.round(splitTimeHours * carbsPerHour * carbsMultiplier);
        const splitWater = Math.round(splitTimeHours * waterPerHour * waterMultiplier);
        const splitSalts = Math.round(splitTimeHours * sodiumPerHour * sodiumMultiplier);
        totalTime += splitTime; totalCarbs += splitCarbs; totalWater += splitWater; totalSalts += splitSalts;
        totalGain += splitData.gain; totalLoss += splitData.loss; totalDistance += splitData.distance;
        splits.push({ ...splitData, time: splitTime, pace: formatPace(splitPace), carbs: splitCarbs, water: splitWater, salts: splitSalts });
        cumulativeDistance += splitData.distance;
        const row = document.createElement('tr'); row.className = 'fade-in';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap"><span class="font-semibold text-gray-50">Split ${i + 1}</span><br><span class="text-sm text-gray-400">${splitData.distance.toFixed(1)}km, +${splitData.gain}m, -${splitData.loss}m</span></td>
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-50">${formatTime(splitTime)}</td><td class="px-6 py-4 whitespace-nowrap font-medium text-gray-50">${formatPace(splitPace)} /km</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-200">${splitCarbs} g</td><td class="px-6 py-4 whitespace-nowrap text-gray-200">${splitWater} ml</td><td class="px-6 py-4 whitespace-nowrap text-gray-200">${splitSalts} mg</td>
        `;
        dom.resultsBody.appendChild(row);
    }
    const totalPace = totalDistance > 0 ? totalTime / totalDistance : 0;
    dom.resultsTotal.innerHTML = `
        <td class="px-6 py-4 text-right uppercase text-gray-300">Total</td><td class="px-6 py-4 text-gray-50">${formatTime(totalTime)}</td>
        <td class="px-6 py-4 text-gray-50">${formatPace(totalPace)} /km</td><td class="px-6 py-4 text-gray-50">${totalCarbs} g</td>
        <td class="px-6 py-4 text-gray-50">${totalWater} ml</td><td class="px-6 py-4 text-gray-50">${totalSalts} mg</td>
    `;
    dom.calculatedPaceValue.textContent = `${formatPace(basePace)} min/km`;
    dom.calculatedPaceDisplay.classList.remove('hidden');
    let planName = "Untitled Race Plan";
    if (currentlyEditingPlanId) {
        const existingPlan = savedPlansCache.find(p => p.id === currentlyEditingPlanId);
        if (existingPlan) planName = existingPlan.name;
    }
    Object.assign(currentPlan, {
        name: planName, 
        raceDate: dom.planDateInput.value || null,
        notes: dom.planNotesInput.value || null,
        totalStats: { distance: totalDistance, gain: totalGain, loss: totalLoss, time: formatTime(totalTime), pace: formatPace(totalPace) + " /km", carbs: totalCarbs, water: totalWater, salts: totalSalts, timeInMinutes: totalTime },
        splits: splits.map((s, i) => ({ name: `Split ${i + 1} (${s.distance.toFixed(1)}km, +${s.gain}m, -${s.loss}m)`, time: formatTime(s.time), pace: `${s.pace} /km`, carbs: `${s.carbs} g`, water: `${s.water} ml`, salts: `${s.salts} mg` })),
        checkpoints: checkpointData, sliders, targetTime: { hours: dom.targetTimeHoursInput.value, mins: dom.targetTimeMinsInput.value }
    });
    dom.resultsSection.classList.remove('hidden'); dom.getAiInsightsBtn.classList.remove('hidden');
    dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

export function formatTime(minutes) {
    if (minutes < 0) return "00:00:00";
    const totalSeconds = Math.round(minutes * 60);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
}

export function formatPace(minutes) {
    if (minutes <= 0 || !isFinite(minutes)) return "00:00";
    const totalSeconds = Math.round(minutes * 60);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

export function calculateEffortPaceZones(raceDistanceKm, raceTimeMinutes, raceGainMeters) {
    const flatEquivalentDistance = raceDistanceKm + (raceGainMeters / 100);
    const gap = raceTimeMinutes / flatEquivalentDistance;
    
    return {
        gap: formatPace(gap),
        easyPace: formatPace(gap * 1.25),
        marathonPace: formatPace(gap * 1.10),
        thresholdPace: formatPace(gap * 1.02),
        intervalPace: formatPace(gap * 0.95),
        gapValue: gap
    };
}