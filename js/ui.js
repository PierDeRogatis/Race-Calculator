import { dom } from './dom.js';

export function showView(viewToShow) {
    const allViews = {
        loginView: dom.loginView, appContainer: dom.appContainer, appView: dom.appView,
        planManagementView: dom.planManagementView, profileView: dom.profileView, libraryView: dom.libraryView
    };
    Object.values(allViews).forEach(view => { if (view) view.classList.add('hidden'); });
    if (viewToShow === 'loginView') {
        if (allViews.loginView) allViews.loginView.classList.remove('hidden');
    } else {
        if (allViews.appContainer) allViews.appContainer.classList.remove('hidden');
        if (allViews[viewToShow]) allViews[viewToShow].classList.remove('hidden');
        if (viewToShow === 'planManagementView') window.renderPlanManagementPage();
        if (viewToShow === 'libraryView') window.renderPublicLibraryPage();
    }
}

export function showNotification(message, isError = false) {
    dom.notificationMessage.textContent = message;
    dom.notificationModal.classList.toggle('bg-red-500', isError);
    dom.notificationModal.classList.toggle('bg-sky-500', !isError);
    dom.notificationModal.classList.remove('hidden', 'fade-out');
    setTimeout(() => {
        dom.notificationModal.classList.add('fade-out');
        setTimeout(() => dom.notificationModal.classList.add('hidden'), 500);
    }, 3000);
}

export function setupUserProfile(user, userPreferences, signOut, auth) {
    const displayName = userPreferences.username || user.displayName || user.email.split('@')[0];
    dom.userProfile.innerHTML = `
        <span class="text-gray-300 hidden md:inline">${displayName}</span>
        <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=38bdf8&color=fff`}" alt="User Photo" class="w-10 h-10 rounded-full border-2 border-sky-400">
        <button id="profileBtn" class="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">Profile</button>
        <button id="libraryBtn" class="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">Course Library</button>
        <button id="signOutBtn" class="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">Sign Out</button>
    `;
    document.getElementById('signOutBtn').addEventListener('click', () => signOut(auth));
    document.getElementById('profileBtn').addEventListener('click', () => showView('profileView'));
    document.getElementById('libraryBtn').addEventListener('click', () => showView('libraryView'));
}

export function generateCheckpointInputs() {
    const numCheckpoints = parseInt(dom.checkpointsInput.value);
    dom.checkpointInputsContainer.innerHTML = '';
    if (numCheckpoints > 0 && numCheckpoints < 51) {
        dom.strategySection.classList.remove('hidden'); dom.chartSection.classList.remove('hidden');
        for (let i = 1; i <= numCheckpoints; i++) {
            const div = document.createElement('div');
            div.className = 'grid grid-cols-1 md:grid-cols-8 gap-x-4 gap-y-2 p-4 border border-gray-700 bg-gray-900/20 rounded-lg fade-in items-center';
            div.innerHTML = `
                <h3 class="md:col-span-1 text-lg font-semibold text-gray-200">Split ${i}</h3>
                <div class="md:col-span-2 relative"><label for="distance-${i}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Distance (km)</label><input type="number" id="distance-${i}" min="0" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
                <div class="md:col-span-2 relative"><label for="gain-${i}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Gain (m)</label><input type="number" id="gain-${i}" min="0" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
                <div class="md:col-span-2 relative"><label for="loss-${i}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Loss (m)</label><input type="number" id="loss-${i}" min="0" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
                <div class="md:col-span-1 flex items-center justify-end gap-2">
                     <button data-action="add" data-index="${i}" class="text-green-400 hover:text-green-300 text-2xl font-bold leading-none" title="Add Split Below">&plus;</button>
                     <button data-action="delete" data-index="${i}" class="text-red-400 hover:text-red-300 text-2xl font-bold leading-none ${numCheckpoints > 1 ? '' : 'hidden'}" title="Delete Split">&minus;</button>
                </div>
            `;
            dom.checkpointInputsContainer.appendChild(div);
        }
    } else {
        dom.strategySection.classList.add('hidden'); dom.chartSection.classList.add('hidden');
    }
}

export function updateChartFromInputs(courseProfileChart) {
    const numCheckpoints = parseInt(dom.checkpointsInput.value);
    if (!numCheckpoints) return;
    let cumulativeDistance = 0, currentElevation = 0;
    const labels = ['Start'], data = [0];
    for (let i = 1; i <= numCheckpoints; i++) {
        cumulativeDistance += parseFloat(document.getElementById(`distance-${i}`).value) || 0;
        currentElevation += (parseFloat(document.getElementById(`gain-${i}`).value) || 0) - (parseFloat(document.getElementById(`loss-${i}`).value) || 0);
        labels.push(cumulativeDistance.toFixed(1));
        data.push(currentElevation);
    }
    const ctx = document.getElementById('courseProfileChart').getContext('2d');
    if (courseProfileChart) {
        courseProfileChart.data.labels = labels; courseProfileChart.data.datasets[0].data = data;
        courseProfileChart.update();
    } else {
        courseProfileChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{
                    label: 'Elevation Profile', data, borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    fill: true, tension: 0.1, pointBackgroundColor: '#38bdf8', pointRadius: 2, }]
            }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: {
                            title: (items) => `Distance: ${items[0].label} km`,
                            label: (item) => `Elevation: ${item.raw.toFixed(0)} m`
                        }}}, scales: {
                    y: { title: { display: true, text: 'Elevation (m)', color: '#9ca3af' }, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                    x: { title: { display: true, text: 'Distance (km)', color: '#9ca3af' }, ticks: { color: '#9ca3af' }, grid: { display: false } }
                }}});
    }
    return courseProfileChart;
}

export function renderPlanManagementPage(currentUser, savedPlansCache, loadUserPlans, showNotification, deleteDoc, doc, db, updateDoc, addDoc, collection) {
    if (!currentUser) return;
    dom.planListContainer.innerHTML = '<div class="spinner mx-auto"></div>';
    loadUserPlans(currentUser.uid, savedPlansCache, dom).then(() => {
        dom.planListContainer.innerHTML = '';
        if (savedPlansCache.length === 0) {
            dom.planListContainer.innerHTML = '<p class="col-span-full text-center text-gray-400">You haven\'t saved any plans yet.</p>';
            return;
        }
        savedPlansCache.forEach(plan => {
            const card = document.createElement('div');
            card.className = 'bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col';
            const isPublicBadge = plan.isPublic ? `<span class="text-xs font-semibold bg-sky-500/20 text-sky-300 px-2 py-1 rounded-full">Public</span>` : '';
            const publishButtonText = plan.isPublic ? 'Unpublish' : 'Publish';
            const publishButtonClass = plan.isPublic ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700';
            const raceDateHtml = plan.raceDate ? `<p class="text-sm font-bold text-sky-300">${new Date(plan.raceDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : '';
            const notesButtonHtml = plan.notes ? `<button class="view-notes-btn text-xs text-gray-400 hover:text-white">View Notes</button>` : '';
            
            card.innerHTML = `
                <div class="flex-grow">
                    <div class="flex justify-between items-start">
                         <h4 class="text-lg font-bold text-white truncate pr-2">${plan.name}</h4>
                         ${isPublicBadge}
                    </div>
                    ${raceDateHtml}
                    <p class="text-sm text-gray-500 mb-4">Saved: ${plan.createdAt ? new Date(plan.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                    <div class="text-sm space-y-1 text-gray-300">
                        <p><strong>Distance:</strong> ${plan.totalStats.distance.toFixed(1)} km</p>
                        <p><strong>Time:</strong> ${plan.totalStats.time}</p>
                        <p><strong>Gain:</strong> ${plan.totalStats.gain} m</p>
                    </div>
                </div>
                <div class="border-t border-gray-700 mt-4 pt-4">
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-2">
                            ${notesButtonHtml}
                        </div>
                        <div class="flex gap-2">
                             <button class="publish-plan-btn text-xs ${publishButtonClass} text-white font-semibold py-1 px-3 rounded-md transition-colors">${publishButtonText}</button>
                             <button class="delete-plan-btn text-xs bg-gray-600 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md transition-colors">Delete</button>
                        </div>
                    </div>
                    <button class="edit-plan-btn w-full bg-gray-700 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Edit Plan</button>
                </div>
            `;

            const viewNotesBtn = card.querySelector('.view-notes-btn');
            if(viewNotesBtn) {
                viewNotesBtn.addEventListener('click', () => {
                    dom.notesModalTitle.textContent = `Notes for ${plan.name}`;
                    dom.notesModalContent.textContent = plan.notes;
                    dom.notesModal.classList.remove('hidden');
                });
            }
            
            card.querySelector('.edit-plan-btn').addEventListener('click', () => {
                window.loadPlanIntoUI(plan);
                showView('appView');
            });

            card.querySelector('.publish-plan-btn').addEventListener('click', async () => {
                if (plan.isPublic) {
                    if (confirm(`Are you sure you want to make "${plan.name}" private? It will be removed from the public library.`)) {
                       try {
                            if(plan.publicPlanId) await deleteDoc(doc(db, "communityPlans", plan.publicPlanId));
                            await updateDoc(doc(db, "users", currentUser.uid, "racePlans", plan.id), { isPublic: false, publicPlanId: null });
                            showNotification("Plan successfully made private.");
                            window.renderPlanManagementPage();
                       } catch(e) { console.error("Error unpublishing plan:", e); showNotification("Could not unpublish plan.", true); }
                    }
                } else {
                    let gpxContent = ''; let i = 1;
                    while(plan[`gpxContent_${i}`]) { gpxContent += plan[`gpxContent_${i}`]; i++; }
                    if (!gpxContent) {
                        showNotification("Only plans with a GPX file can be made public.", true);
                        return;
                    }
                     if (confirm(`Are you sure you want to make "${plan.name}" public? It will appear in the public library.`)) {
                        try {
                            const publicPlanData = { ...plan };
                            delete publicPlanData.id;
                            const publicDocRef = await addDoc(collection(db, "communityPlans"), publicPlanData);
                            await updateDoc(doc(db, "users", currentUser.uid, "racePlans", plan.id), { isPublic: true, publicPlanId: publicDocRef.id });
                            showNotification("Plan successfully published!");
                            window.renderPlanManagementPage();
                        } catch(e) { console.error("Error publishing plan:", e); showNotification("Could not publish plan.", true); }
                    }
                }
            });

            card.querySelector('.delete-plan-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete the plan "${plan.name}"? This cannot be undone.`)) {
                    try {
                        if (plan.isPublic && plan.publicPlanId) {
                            await deleteDoc(doc(db, "communityPlans", plan.publicPlanId));
                        }
                        await deleteDoc(doc(db, "users", currentUser.uid, "racePlans", plan.id));
                        showNotification("Plan deleted successfully.");
                        window.renderPlanManagementPage();
                    } catch (error) { console.error("Error deleting plan:", error); showNotification("Could not delete plan.", true); }
                }
            });
            dom.planListContainer.appendChild(card);
        });
    });
}

export function createSplitRow(index, updateChartFromInputs) {
     const div = document.createElement('div');
     div.className = 'grid grid-cols-1 md:grid-cols-8 gap-x-4 gap-y-2 p-4 border border-gray-700 bg-gray-900/20 rounded-lg fade-in items-center';
     div.innerHTML = `
        <h3 class="md:col-span-1 text-lg font-semibold text-gray-200">Split ${index}</h3>
        <div class="md:col-span-2 relative"><label for="distance-${index}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Distance (km)</label><input type="number" id="distance-${index}" min="0" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
        <div class="md:col-span-2 relative"><label for="gain-${index}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Gain (m)</label><input type="number" id="gain-${index}" min="0" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
        <div class="md:col-span-2 relative"><label for="loss-${index}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Loss (m)</label><input type="number" id="loss-${index}" min="0" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
        <div class="md:col-span-1 flex items-center justify-end gap-2">
             <button data-action="add" data-index="${index}" class="text-green-400 hover:text-green-300 text-2xl font-bold leading-none" title="Add Split Below">&plus;</button>
             <button data-action="delete" data-index="${index}" class="text-red-400 hover:text-red-300 text-2xl font-bold leading-none" title="Delete Split">&minus;</button>
        </div>
    `;
    return div;
}

export function renumberSplits(updateChartFromInputs) {
    const rows = Array.from(dom.checkpointInputsContainer.children);
    dom.checkpointsInput.value = rows.length;
    dom.checkpointsInput.disabled = true;

    rows.forEach((row, index) => {
        const newIndex = index + 1;
        row.querySelector('h3').textContent = `Split ${newIndex}`;
        row.querySelector('label[for^="distance-"]').htmlFor = `distance-${newIndex}`;
        row.querySelector('input[id^="distance-"]').id = `distance-${newIndex}`;
        row.querySelector('label[for^="gain-"]').htmlFor = `gain-${newIndex}`;
        row.querySelector('input[id^="gain-"]').id = `gain-${newIndex}`;
        row.querySelector('label[for^="loss-"]').htmlFor = `loss-${newIndex}`;
        row.querySelector('input[id^="loss-"]').id = `loss-${newIndex}`;
        row.querySelector('button[data-action="add"]').dataset.index = newIndex;
        const deleteBtn = row.querySelector('button[data-action="delete"]');
        deleteBtn.dataset.index = newIndex;
        deleteBtn.classList.toggle('hidden', rows.length <= 1);
    });
    updateChartFromInputs();
}

export function loadPlanIntoUI(plan, generateCheckpointInputs, updateChartFromInputs, runCalculationsAndUpdateUI, currentPlan, currentlyEditingPlanId) {
    dom.checkpointsInput.value = plan.checkpoints.length;
    generateCheckpointInputs();
    plan.checkpoints.forEach((cp, index) => {
        const i = index + 1;
        document.getElementById(`distance-${i}`).value = cp.distance;
        document.getElementById(`gain-${i}`).value = cp.gain;
        document.getElementById(`loss-${i}`).value = cp.loss;
    });
    dom.pacingStrategySlider.value = plan.sliders.pacing;
    dom.uphillEffortSlider.value = plan.sliders.uphill;
    dom.downhillEffortSlider.value = plan.sliders.downhill;
    dom.temperatureSlider.value = plan.sliders.temp;
    dom.targetTimeHoursInput.value = plan.targetTime.hours;
    dom.targetTimeMinsInput.value = plan.targetTime.mins;
    
    let gpxContent = ''; let i = 1;
    while (plan[`gpxContent_${i}`]) { gpxContent += plan[`gpxContent_${i}`]; i++; }
    if (gpxContent) {
        currentPlan.gpxContent = gpxContent;
        dom.gpxStatus.textContent = 'GPX course loaded from saved plan.';
    } else { currentPlan.gpxContent = null; dom.gpxStatus.textContent = ''; }
    updateChartFromInputs();
    runCalculationsAndUpdateUI();
}

export function handleGpxFile(event, currentPlan, generateCheckpointInputs, renumberSplits) {
    const file = event.target.files[0];
    if (!file) return;
    dom.gpxStatus.textContent = `Processing ${file.name}...`;
    const reader = new FileReader();
    reader.onload = (e) => processGpxContent(e.target.result, file.name, currentPlan, generateCheckpointInputs, renumberSplits);
    reader.readAsText(file);
}

function processGpxContent(gpxContent, fileName, currentPlan, generateCheckpointInputs, renumberSplits) {
    currentPlan.gpxContent = gpxContent;
    dom.checkpointsInput.disabled = false;
    const xmlDoc = new DOMParser().parseFromString(gpxContent, "text/xml");
    const points = Array.from(xmlDoc.getElementsByTagName("trkpt")).map(pt => ({
        lat: parseFloat(pt.getAttribute("lat")),
        lon: parseFloat(pt.getAttribute("lon")),
        ele: parseFloat(pt.getElementsByTagName("ele")[0].textContent)
    }));
    if (points.length < 2) { dom.gpxStatus.textContent = 'Error: GPX has insufficient track points.'; return; }
    const numSplits = parseInt(dom.checkpointsInput.value) || 10;
    dom.checkpointsInput.value = numSplits;
    generateCheckpointInputs();
    const pointsPerSplit = Math.floor(points.length / numSplits);
    let currentPointIndex = 0;
    for (let i = 1; i <= numSplits; i++) {
        const startIdx = currentPointIndex;
        const endIdx = (i === numSplits) ? points.length - 1 : currentPointIndex + pointsPerSplit;
        let splitDist = 0, splitGain = 0, splitLoss = 0;
        for (let j = startIdx; j < endIdx; j++) {
            splitDist += haversineDistance(points[j], points[j + 1]);
            const eleDiff = points[j + 1].ele - points[j].ele;
            if (eleDiff > 0) splitGain += eleDiff;
            else splitLoss -= eleDiff;
        }
        document.getElementById(`distance-${i}`).value = splitDist.toFixed(2);
        document.getElementById(`gain-${i}`).value = Math.round(splitGain);
        document.getElementById(`loss-${i}`).value = Math.round(splitLoss);
        currentPointIndex = endIdx;
    }
    dom.gpxStatus.textContent = `Imported ${fileName} into ${numSplits} splits.`;
    renumberSplits();
}

function haversineDistance(p1, p2) {
    const R = 6371; const dLat = (p2.lat - p1.lat) * Math.PI / 180; const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resetShareModal() {
    dom.sharePlanModal.classList.add('hidden');
    dom.shareSuccessView.classList.add('hidden');
    dom.shareConfirmView.classList.remove('hidden');
    dom.shareConfirmInput.value = '';
    dom.shareModalError.textContent = '';
}

export function generatePdfDoc(currentPlan) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const planName = currentPlan.name || 'Race Strategy Plan';
    const totals = currentPlan.totalStats;
    const raceDate = currentPlan.raceDate ? new Date(currentPlan.raceDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(planName, 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text(`Generated by WatchForward.co Race Modeler`, 14, 25);
    
    let yPos = 45;

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text('Race Overview & Totals', 14, yPos);
    yPos += 7;
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(`Race Date: ${raceDate}`, 14, yPos);
    yPos += 6;
    doc.text(`Target Time: ${totals.time}`, 14, yPos);
    doc.text(`Avg. Pace: ${totals.pace}`, 80, yPos);
    yPos += 6;
    doc.text(`Distance: ${totals.distance.toFixed(2)} km`, 14, yPos);
    doc.text(`Elevation Gain: ${totals.gain} m`, 80, yPos);
    yPos += 10;
    doc.text(`Total Carbs: ${totals.carbs} g`, 14, yPos);
    doc.text(`Total Water: ${totals.water} ml`, 80, yPos);
    doc.text(`Total Electrolytes: ${totals.salts} mg`, 140, yPos);
    yPos += 10;

    if (currentPlan.notes) {
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text('Personal Notes', 14, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const notesLines = doc.splitTextToSize(currentPlan.notes, 180);
        doc.text(notesLines, 14, yPos);
        yPos += (notesLines.length * 5) + 5;
    }

    const tableBody = currentPlan.splits.map(s => [s.name, s.time, s.pace, s.carbs, s.water, s.salts]);
    doc.autoTable({
        startY: yPos,
        head: [['Split', 'Time', 'Pace', 'Carbs', 'Water', 'Salts']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [15, 118, 110] },
        styles: { font: 'Inter', cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 45 } }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, 287, { align: 'center' });
    }

    return doc;
}

export function validateInputs() {
    const rows = Array.from(dom.checkpointInputsContainer.children);
    let isValid = true;
    
    // Remove old red borders
    rows.forEach(row => {
        row.querySelectorAll('input').forEach(input => {
            input.classList.remove('border-red-500');
        });
    });
    
    // Validate each row
    rows.forEach((row, index) => {
        const i = index + 1;
        const distanceInput = document.getElementById(`distance-${i}`);
        const gainInput = document.getElementById(`gain-${i}`);
        const lossInput = document.getElementById(`loss-${i}`);
        
        const distance = parseFloat(distanceInput.value);
        const gain = parseFloat(gainInput.value);
        const loss = parseFloat(lossInput.value);
        
        if (isNaN(distance) || distance < 0) {
            distanceInput.classList.add('border-red-500');
            isValid = false;
        }
        if (isNaN(gain) || gain < 0) {
            gainInput.classList.add('border-red-500');
            isValid = false;
        }
        if (isNaN(loss) || loss < 0) {
            lossInput.classList.add('border-red-500');
            isValid = false;
        }
    });
    
    return isValid;
}

export function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}

export function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const isLight = savedTheme === 'light';
    if (isLight) {
        document.body.classList.add('light-mode');
    }
    updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
    const icon = document.getElementById('theme-icon');
    if (isLight) {
        icon.innerHTML = '<path fill-rule="evenodd" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" clip-rule="evenodd" />';
    } else {
        icon.innerHTML = '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />';
    }
}

export async function fetchAiInsights(currentPlan) {
    dom.aiInsightsContainer.classList.remove('hidden'); dom.aiInsightsLoading.style.display = 'flex'; dom.aiInsightsContent.classList.add('hidden'); dom.aiInsightsError.classList.add('hidden');
    const getStrategyText = (v, o) => (v > 3 ? o[2] : v < -3 ? o[0] : o[1]);
    const systemPrompt = `You are an expert ultramarathon coach. Provide clear, encouraging, actionable advice. Analyze the race data and strategy. Generate a concise plan for **Pacing**, **Nutrition & Hydration**, and **Mental Prep**. Relate advice to the data. Format with ## headings.`;
    const userQuery = `My race plan:\\n**Overview:**\\n- Race Date: ${currentPlan.raceDate || 'Not set'}\\n- Distance: ${currentPlan.totalStats.distance.toFixed(1)} km\\n- Gain: ${currentPlan.totalStats.gain} m\\n- Time: ${currentPlan.totalStats.time}\\n- Temp: ${currentPlan.sliders.temp}°C\\n**My Notes:** ${currentPlan.notes || 'None'}\\n**Fuel Plan:**\\n- Carbs: ${currentPlan.totalStats.carbs} g\\n- Water: ${currentPlan.totalStats.water} ml\\n- Lytes: ${currentPlan.totalStats.salts} mg\\n**Strategy:**\\n- Pacing: ${getStrategyText(currentPlan.sliders.pacing, ["Conservative Start", "Even Split", "Aggressive Start"])}\\n- Uphills: ${getStrategyText(currentPlan.sliders.uphill, ["Conserve", "Neutral", "Push"])}\\n- Downhills: ${getStrategyText(currentPlan.sliders.downhill, ["Recover", "Neutral", "Attack"])}\\n**Splits:**\\n${currentPlan.splits.map(s => `- ${s.name}: Time: ${s.time}, Pace: ${s.pace}`).join('\\n')}`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } }) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            dom.aiInsightsContent.innerHTML = marked.parse(text);
            dom.aiInsightsContent.classList.remove('hidden');
        } else { throw new Error("Invalid API response."); }
    } catch (error) { console.error("AI insights error:", error); dom.aiInsightsError.classList.remove('hidden');
    } finally { dom.aiInsightsLoading.style.display = 'none'; }
}