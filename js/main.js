import { dom } from './dom.js';
import { 
    auth, db, storage, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
    collection, addDoc, getDocs, doc, query, orderBy, serverTimestamp, updateDoc, deleteDoc, setDoc, getDoc,
    ref, uploadBytes, getDownloadURL, loadUserPlans, savePlan, renderPublicLibraryPage, loadUserPreferences
} from './firebase.js';
import { 
    showView, showNotification, setupUserProfile, generateCheckpointInputs, updateChartFromInputs,
    renderPlanManagementPage, createSplitRow, renumberSplits, loadPlanIntoUI, handleGpxFile,
    resetShareModal, generatePdfDoc, fetchAiInsights, toggleTheme, loadSavedTheme
} from './ui.js';
import { 
    calculateSingleSplitTime, calculateTotalTimeForPace, findBestPaceForTargetTime, 
    generatePlanFromPace, formatTime, formatPace
} from './calculations.js';

const { jsPDF } = window.jspdf;

let currentUser = null;
let courseProfileChart;
let currentPlan = { gpxContent: null };
let savedPlansCache = [];
let currentlyEditingPlanId = null;
let userPreferences = {};

// Initialize theme on page load
loadSavedTheme();

onAuthStateChanged(auth, user => {
    dom.authError.textContent = '';
    if (user) {
        currentUser = user;
        showView('appView');
        loadUserPreferences(user.uid, userPreferences, dom).then(() => {
            setupUserProfile(user, userPreferences, signOut, auth);
            loadUserPlans(user.uid, savedPlansCache, dom);
        });
    } else {
        currentUser = null;
        showView('loginView');
    }
});

// Authentication event listeners
dom.signInBtn.addEventListener('click', async () => { 
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (error) { handleAuthError(error); } 
});

dom.signUpEmailBtn.addEventListener('click', async () => { 
    try { await createUserWithEmailAndPassword(auth, dom.emailInput.value, dom.passwordInput.value); } 
    catch (error) { handleAuthError(error); } 
});

dom.signInEmailBtn.addEventListener('click', async () => { 
    try { await signInWithEmailAndPassword(auth, dom.emailInput.value, dom.passwordInput.value); } 
    catch (error) { handleAuthError(error); } 
});

dom.resetPasswordBtn.addEventListener('click', async () => {
    if (!dom.emailInput.value) { dom.authError.textContent = 'Please enter your email to reset.'; return; }
    try { 
        await sendPasswordResetEmail(auth, dom.emailInput.value); 
        dom.authError.textContent = 'Password reset email sent!'; 
        dom.authError.classList.remove('text-red-400'); 
        dom.authError.classList.add('text-green-400');
    } catch (error) { handleAuthError(error); }
});

function handleAuthError(error) {
    console.error("Full authentication error object:", error);
    dom.authError.classList.add('text-red-400'); dom.authError.classList.remove('text-green-400');
    if (error.code === 'auth/unauthorized-domain') {
        const msg = "CRITICAL SETUP ERROR: This app's domain is not authorized. Go to your Firebase project -> Authentication -> Settings -> Authorized domains and add the required domain.";
        console.error(msg);
        dom.authError.textContent = 'Configuration error. See console for details.';
        return;
    }
    switch (error.code) {
        case 'auth/invalid-email': dom.authError.textContent = 'Please enter a valid email address.'; break;
        case 'auth/user-not-found': dom.authError.textContent = 'No account found with this email.'; break;
        case 'auth/wrong-password': case 'auth/invalid-credential': dom.authError.textContent = 'Incorrect email or password.'; break;
        case 'auth/email-already-in-use': dom.authError.textContent = 'This email is already registered.'; break;
        case 'auth/weak-password': dom.authError.textContent = 'Password should be at least 6 characters.'; break;
        default: dom.authError.textContent = 'An authentication error occurred.';
    }
}

// User preferences
dom.savePreferencesBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const preferences = {
        weight: parseFloat(dom.prefWeight.value) || null,
        height: parseFloat(dom.prefHeight.value) || null,
        fitness: dom.prefFitness.value,
        sweat: dom.prefSweat.value,
    };
    const username = dom.prefUsername.value.trim();
    try {
        await setDoc(doc(db, "users", currentUser.uid), { preferences, username }, { merge: true });
        Object.assign(userPreferences, { ...preferences, username });
        showNotification("Preferences saved successfully!");
        setupUserProfile(currentUser, userPreferences, signOut, auth);
    } catch (error) { 
        console.error("Error saving preferences:", error); 
        showNotification("Could not save preferences.", true); 
    }
});

// Plan management
dom.savePlanBtn.addEventListener('click', () => {
    if (!currentUser) { showNotification("Please sign in to save a plan.", true); return; }
    if (!currentPlan.splits || currentPlan.splits.length === 0) { showNotification("Please generate a plan before saving.", true); return; }

    dom.planNameInput.value = (currentlyEditingPlanId && currentPlan.name !== "Untitled Race Plan") ? currentPlan.name : "";
    dom.planDateInput.value = currentPlan.raceDate || "";
    dom.planNotesInput.value = currentPlan.notes || "";

    dom.saveModalError.textContent = '';
    dom.makePublicToggle.checked = false;
    if (currentlyEditingPlanId) {
        const existingPlan = savedPlansCache.find(p => p.id === currentlyEditingPlanId);
        dom.makePublicToggle.checked = existingPlan.isPublic || false;
        dom.saveModalTitle.textContent = "Update or Save as New";
        dom.updatePlanWrapper.classList.remove('hidden');
        dom.updatePlanCheckbox.checked = true;
    } else {
        dom.saveModalTitle.textContent = "Save Your Plan";
        dom.updatePlanWrapper.classList.add('hidden');
        dom.updatePlanCheckbox.checked = false;
    }
    dom.savePlanModal.classList.remove('hidden');
});

dom.cancelSaveBtn.addEventListener('click', () => dom.savePlanModal.classList.add('hidden'));

dom.confirmSaveBtn.addEventListener('click', async () => {
    const planName = dom.planNameInput.value.trim();
    if (!planName) { dom.saveModalError.textContent = 'Please enter a name for the plan.'; return; }

    const isPublic = dom.makePublicToggle.checked;
    if (isPublic && !currentPlan.gpxContent) {
        dom.saveModalError.textContent = 'Only plans with an imported GPX file can be made public.';
        return;
    }
    dom.saveModalError.textContent = '';
    dom.confirmSaveBtn.disabled = true; dom.confirmSaveBtn.textContent = 'Saving...';

    const planData = {
        name: planName,
        raceDate: dom.planDateInput.value || null,
        notes: dom.planNotesInput.value.trim() || null,
        totalStats: currentPlan.totalStats,
        splits: currentPlan.splits,
        checkpoints: currentPlan.checkpoints,
        sliders: currentPlan.sliders,
        targetTime: currentPlan.targetTime,
        userId: currentUser.uid,
        author: userPreferences.username || currentUser.displayName || currentUser.email.split('@')[0],
        createdAt: serverTimestamp(),
        isPublic,
    };

    if (currentPlan.gpxContent) {
        const CHUNK_SIZE = 900000;
        for (let i = 0; i * CHUNK_SIZE < currentPlan.gpxContent.length; i++) {
            planData[`gpxContent_${i + 1}`] = currentPlan.gpxContent.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        }
    }

    try {
        let privatePlanId = currentlyEditingPlanId;
        if (currentlyEditingPlanId && dom.updatePlanCheckbox.checked) {
            await updateDoc(doc(db, "users", currentUser.uid, "racePlans", currentlyEditingPlanId), planData);
            showNotification("Plan updated successfully!");
        } else {
            const docRef = await addDoc(collection(db, "users", currentUser.uid, "racePlans"), planData);
            privatePlanId = docRef.id;
            currentlyEditingPlanId = privatePlanId;
            showNotification("Plan saved successfully!");
        }

        const privatePlanRef = doc(db, "users", currentUser.uid, "racePlans", privatePlanId);
        const existingPlan = savedPlansCache.find(p => p.id === privatePlanId);

        if (isPublic) {
            const publicPlanData = { ...planData };
            if (existingPlan && existingPlan.publicPlanId) {
                await updateDoc(doc(db, "communityPlans", existingPlan.publicPlanId), publicPlanData);
            } else {
                const publicDocRef = await addDoc(collection(db, "communityPlans"), publicPlanData);
                await updateDoc(privatePlanRef, { publicPlanId: publicDocRef.id });
            }
             showNotification("Plan shared with the community!");
        } else if (existingPlan && existingPlan.publicPlanId) {
            await deleteDoc(doc(db, "communityPlans", existingPlan.publicPlanId));
            await updateDoc(privatePlanRef, { publicPlanId: null });
            showNotification("Plan was made private.");
        }

        dom.savePlanModal.classList.add('hidden');
        loadUserPlans(currentUser.uid, savedPlansCache, dom);
    } catch (error) {
        console.error("Error saving/updating plan:", error);
        dom.saveModalError.textContent = "Could not save plan. Check console for details.";
    } finally {
        dom.confirmSaveBtn.disabled = false; dom.confirmSaveBtn.textContent = 'Save';
    }
});

dom.closeNotesModalBtn.addEventListener('click', () => dom.notesModal.classList.add('hidden'));

dom.savedPlansDropdown.addEventListener('change', (e) => {
    const planId = e.target.value;
    if (!planId) { currentlyEditingPlanId = null; return; }
    const plan = savedPlansCache.find(p => p.id === planId);
    if (plan) {
        currentlyEditingPlanId = plan.id;
        loadPlanIntoUI(plan, generateCheckpointInputs, () => updateChartFromInputs(courseProfileChart), runCalculationsAndUpdateUI, currentPlan, currentlyEditingPlanId);
    }
});

// Navigation
dom.managePlansBtn.addEventListener('click', () => showView('planManagementView'));
dom.backToModelerBtn.addEventListener('click', () => showView('appView'));
dom.backToModelerBtnFromProfile.addEventListener('click', () => showView('appView'));
dom.backToModelerBtnFromLibrary.addEventListener('click', () => showView('appView'));

// UI and calculations
dom.gpxFileInput.addEventListener('change', (event) => handleGpxFile(event, currentPlan, generateCheckpointInputs, () => renumberSplits(() => updateChartFromInputs(courseProfileChart))));

dom.checkpointsInput.addEventListener('input', () => { 
    dom.gpxFileInput.value = ''; 
    currentPlan.gpxContent = null; 
    dom.gpxStatus.textContent = ''; 
    generateCheckpointInputs(); 
});

dom.calculateBtn.addEventListener('click', runCalculationsAndUpdateUI);

dom.downloadPdfBtn.addEventListener('click', () => {
    if (!currentPlan.splits) { showNotification("Please generate a plan first.", true); return; }
    const doc = generatePdfDoc(currentPlan);
    doc.save(`${(currentPlan.name || 'Race-Plan').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
});

dom.sharePlanBtn.addEventListener('click', () => {
    if (!currentUser) { showNotification("Please sign in to share a plan.", true); return; }
    if (!currentPlan.splits || currentPlan.splits.length === 0) { showNotification("Please generate a plan first.", true); return; }
    const planName = currentPlan.name || "Untitled Race Plan";
    dom.sharePlanNameConfirm.textContent = planName;
    dom.sharePlanModal.classList.remove('hidden');
});

dom.getAiInsightsBtn.addEventListener('click', () => fetchAiInsights(currentPlan));

[dom.targetTimeHoursInput, dom.targetTimeMinsInput, dom.pacingStrategySlider, dom.uphillEffortSlider, dom.downhillEffortSlider, dom.temperatureSlider].forEach(el => {
    el.addEventListener('input', () => { 
        if (!dom.resultsSection.classList.contains('hidden')) { 
            runCalculationsAndUpdateUI(); 
        } 
    });
});

dom.cancelShareBtn.addEventListener('click', resetShareModal);
dom.closeShareModalBtn.addEventListener('click', resetShareModal);

dom.confirmShareBtn.addEventListener('click', async () => {
    const planName = currentPlan.name || "Untitled Race Plan";
    if (dom.shareConfirmInput.value !== planName) { 
        dom.shareModalError.textContent = 'The name does not match. Sharing cancelled.'; 
        return; 
    }
    dom.shareModalError.textContent = '';
    dom.confirmShareBtn.disabled = true; 
    dom.confirmShareBtn.textContent = 'Uploading...';
    try {
        const pdfDoc = generatePdfDoc(currentPlan);
        const pdfBlob = pdfDoc.output('blob');
        const uniqueId = `${currentUser.uid}-${Date.now()}`;
        const storageRef = ref(storage, `sharedPlans/${uniqueId}.pdf`);
        await uploadBytes(storageRef, pdfBlob);
        const downloadURL = await getDownloadURL(storageRef);
        dom.shareConfirmView.classList.add('hidden');
        dom.shareableLinkInput.value = downloadURL;
        dom.shareSuccessView.classList.remove('hidden');
    } catch (error) { 
        console.error("Error sharing plan:", error); 
        dom.shareModalError.textContent = "Upload failed. Check storage rules.";
    } finally { 
        dom.confirmShareBtn.disabled = false; 
        dom.confirmShareBtn.textContent = 'Confirm & Share'; 
    }
});

dom.copyLinkBtn.addEventListener('click', () => {
    dom.shareableLinkInput.select();
    document.execCommand('copy');
    dom.copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => { dom.copyLinkBtn.textContent = 'Copy'; }, 2000);
});

// Theme toggle
dom.themeToggle.addEventListener('click', toggleTheme);

dom.checkpointInputsContainer.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action) return;

    const currentRows = Array.from(dom.checkpointInputsContainer.children);
    const currentIndex = parseInt(e.target.dataset.index);
    
    if (action === 'add') {
        const newRow = createSplitRow(currentIndex + 1, () => updateChartFromInputs(courseProfileChart));
        currentRows[currentIndex - 1].after(newRow);
    } else if (action === 'delete') {
        if(currentRows.length > 1) {
            currentRows[currentIndex - 1].remove();
        }
    }
    renumberSplits(() => updateChartFromInputs(courseProfileChart));
});

function runCalculationsAndUpdateUI() {
    const numCheckpoints = parseInt(dom.checkpointsInput.value);
    if (!numCheckpoints) return false;
    const targetTime = (parseFloat(dom.targetTimeHoursInput.value) || 0) * 60 + (parseFloat(dom.targetTimeMinsInput.value) || 0);
    const sliders = { 
        pacing: parseInt(dom.pacingStrategySlider.value), 
        uphill: parseInt(dom.uphillEffortSlider.value), 
        downhill: parseInt(dom.downhillEffortSlider.value), 
        temp: parseInt(dom.temperatureSlider.value) 
    };
    const checkpointData = Array.from({ length: numCheckpoints }, (_, i) => ({
        distance: parseFloat(document.getElementById(`distance-${i + 1}`).value) || 0,
        gain: parseFloat(document.getElementById(`gain-${i + 1}`).value) || 0,
        loss: parseFloat(document.getElementById(`loss-${i + 1}`).value) || 0,
    }));
    const totalDistance = checkpointData.reduce((sum, cp) => sum + cp.distance, 0);
    if (totalDistance <= 0 || targetTime <= 0) { 
        dom.resultsSection.classList.add('hidden'); 
        return false; 
    }
    const basePace = findBestPaceForTargetTime(targetTime, checkpointData, sliders);
    generatePlanFromPace(basePace, checkpointData, sliders, userPreferences, dom, currentPlan, currentlyEditingPlanId, savedPlansCache);
    return true;
}

// Make functions available globally for UI module
window.renderPlanManagementPage = () => renderPlanManagementPage(currentUser, savedPlansCache, loadUserPlans, showNotification, deleteDoc, doc, db, updateDoc, addDoc, collection);

window.renderPublicLibraryPage = () => renderPublicLibraryPage(dom, currentUser, window.loadPlanIntoUI, showView, showNotification);

// Make loadPlanIntoUI available globally for Firebase module  
window.loadPlanIntoUI = (plan) => {
    currentlyEditingPlanId = null;
    loadPlanIntoUI(plan, generateCheckpointInputs, () => updateChartFromInputs(courseProfileChart), runCalculationsAndUpdateUI, currentPlan, currentlyEditingPlanId);
};