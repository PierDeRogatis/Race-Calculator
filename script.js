import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, query, orderBy, serverTimestamp, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- SCRIPT START ---

const firebaseConfig = {
    apiKey: "AIzaSyA1Xqqf3GLLbeyt0GjV6Do3d0HZ0ycdYxY",
    authDomain: "watchforward-25572.firebaseapp.com",
    projectId: "watchforward-25572",
    storageBucket: "watchforward-25572.appspot.com",
    messagingSenderId: "467244820937",
    appId: "1:467244820937:web:34c8f3e3efd398db97e018",
    measurementId: "G-V61WEFYSVH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const { jsPDF } = window.jspdf;

// --- DOM ELEMENT MAPPING ---
const dom = {
    loginView: document.getElementById('login-view'),
    appContainer: document.getElementById('app-container'),
    appView: document.getElementById('app-view'),
    planManagementView: document.getElementById('plan-management-view'),
    profileView: document.getElementById('profile-view'),
    libraryView: document.getElementById('library-view'),
    signInBtn: document.getElementById('signInBtn'),
    userProfile: document.getElementById('user-profile'),
    savePlanBtn: document.getElementById('savePlanBtn'),
    savedPlansDropdown: document.getElementById('savedPlansDropdown'),
    downloadPdfBtn: document.getElementById('downloadPdfBtn'),
    sharePlanBtn: document.getElementById('sharePlanBtn'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    signInEmailBtn: document.getElementById('signInEmailBtn'),
    signUpEmailBtn: document.getElementById('signUpEmailBtn'),
    authError: document.getElementById('auth-error'),
    resetPasswordBtn: document.getElementById('resetPasswordBtn'),
    gpxFileInput: document.getElementById('gpxFile'),
    gpxStatus: document.getElementById('gpx-status'),
    checkpointsInput: document.getElementById('checkpoints'),
    checkpointInputsContainer: document.getElementById('checkpoint-inputs'),
    calculateBtn: document.getElementById('calculateBtn'),
    resultsSection: document.getElementById('results'),
    resultsBody: document.getElementById('results-body'),
    resultsTotal: document.getElementById('results-total'),
    targetTimeHoursInput: document.getElementById('targetTimeHours'),
    targetTimeMinsInput: document.getElementById('targetTimeMins'),
    getAiInsightsBtn: document.getElementById('getAiInsightsBtn'),
    aiInsightsContainer: document.getElementById('ai-insights-container'),
    aiInsightsLoading: document.getElementById('ai-insights-loading'),
    aiInsightsContent: document.getElementById('ai-insights-content'),
    aiInsightsError: document.getElementById('ai-insights-error'),
    pacingStrategySlider: document.getElementById('pacingStrategy'),
    uphillEffortSlider: document.getElementById('uphillEffort'),
    downhillEffortSlider: document.getElementById('downhillEffort'),
    temperatureSlider: document.getElementById('temperature'),
    calculatedPaceDisplay: document.getElementById('calculated-pace-display'),
    calculatedPaceValue: document.getElementById('calculated-pace-value'),
    strategySection: document.getElementById('strategy-section'),
    chartSection: document.getElementById('chart-section'),
    managePlansBtn: document.getElementById('managePlansBtn'),
    backToModelerBtn: document.getElementById('backToModelerBtn'),
    planListContainer: document.getElementById('plan-list-container'),
    libraryContainer: document.getElementById('library-container'),
    backToModelerBtnFromProfile: document.getElementById('backToModelerBtn-from-profile'),
    backToModelerBtnFromLibrary: document.getElementById('backToModelerBtn-from-library'),
    prefUsername: document.getElementById('prefUsername'),
    prefWeight: document.getElementById('prefWeight'),
    prefHeight: document.getElementById('prefHeight'),
    prefFitness: document.getElementById('prefFitness'),
    prefSweat: document.getElementById('prefSweat'),
    savePreferencesBtn: document.getElementById('savePreferencesBtn'),
    notificationModal: document.getElementById('notification-modal'),
    notificationMessage: document.getElementById('notification-message'),
    savePlanModal: document.getElementById('save-plan-modal'),
    planNameInput: document.getElementById('planNameInput'),
    planDateInput: document.getElementById('planDateInput'),
    planNotesInput: document.getElementById('planNotesInput'),
    cancelSaveBtn: document.getElementById('cancelSaveBtn'),
    confirmSaveBtn: document.getElementById('confirmSaveBtn'),
    saveModalError: document.getElementById('save-modal-error'),
    saveModalTitle: document.getElementById('save-modal-title'),
    saveOptions: document.getElementById('save-options'),
    updatePlanWrapper: document.getElementById('update-plan-wrapper'),
    updatePlanCheckbox: document.getElementById('updatePlanCheckbox'),
    makePublicToggle: document.getElementById('makePublicToggle'),
    notesModal: document.getElementById('notes-modal'),
    notesModalTitle: document.getElementById('notes-modal-title'),
    notesModalContent: document.getElementById('notes-modal-content'),
    closeNotesModalBtn: document.getElementById('closeNotesModalBtn'),
    sharePlanModal: document.getElementById('share-plan-modal'),
    shareConfirmView: document.getElementById('share-confirm-view'),
    shareSuccessView: document.getElementById('share-success-view'),
    sharePlanNameConfirm: document.getElementById('share-plan-name-confirm'),
    shareConfirmInput: document.getElementById('shareConfirmInput'),
    shareModalError: document.getElementById('share-modal-error'),
    cancelShareBtn: document.getElementById('cancelShareBtn'),
    confirmShareBtn: document.getElementById('confirmShareBtn'),
    shareableLinkInput: document.getElementById('shareableLinkInput'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    closeShareModalBtn: document.getElementById('closeShareModalBtn'),
};

let currentUser = null;
let courseProfileChart;
let currentPlan = { gpxContent: null };
let savedPlansCache = [];
let currentlyEditingPlanId = null;
let userPreferences = {};

// --- Core App Logic & Event Listeners ---
function showView(viewToShow) {
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
        if (viewToShow === 'planManagementView') renderPlanManagementPage();
        if (viewToShow === 'libraryView') renderPublicLibraryPage();
    }
}

function showNotification(message, isError = false) {
    dom.notificationMessage.textContent = message;
    dom.notificationModal.classList.toggle('bg-red-500', isError);
    dom.notificationModal.classList.toggle('bg-sky-500', !isError);
    dom.notificationModal.classList.remove('hidden', 'fade-out');
    setTimeout(() => {
        dom.notificationModal.classList.add('fade-out');
        setTimeout(() => dom.notificationModal.classList.add('hidden'), 500);
    }, 3000);
}

onAuthStateChanged(auth, user => {
    dom.authError.textContent = '';
    if (user) {
        currentUser = user;
        showView('appView');
        loadUserPreferences(user.uid).then(() => {
            setupUserProfile(user);
            loadUserPlans(user.uid);
        });
    } else {
        currentUser = null;
        showView('loginView');
    }
});

// --- AUTHENTICATION ---
dom.signInBtn.addEventListener('click', async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { handleAuthError(error); } });
dom.signUpEmailBtn.addEventListener('click', async () => { try { await createUserWithEmailAndPassword(auth, dom.emailInput.value, dom.passwordInput.value); } catch (error) { handleAuthError(error); } });
dom.signInEmailBtn.addEventListener('click', async () => { try { await signInWithEmailAndPassword(auth, dom.emailInput.value, dom.passwordInput.value); } catch (error) { handleAuthError(error); } });
dom.resetPasswordBtn.addEventListener('click', async () => {
    if (!dom.emailInput.value) { dom.authError.textContent = 'Please enter your email to reset.'; return; }
    try { await sendPasswordResetEmail(auth, dom.emailInput.value); dom.authError.textContent = 'Password reset email sent!'; dom.authError.classList.remove('text-red-400'); dom.authError.classList.add('text-green-400');
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

function setupUserProfile(user) {
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

// --- USER PREFERENCES ---
async function loadUserPreferences(userId) {
    const docRef = doc(db, "users", userId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            userPreferences = data.preferences || {};
            userPreferences.username = data.username || null;
            dom.prefUsername.value = userPreferences.username || '';
            dom.prefWeight.value = userPreferences.weight || '';
            dom.prefHeight.value = userPreferences.height || '';
            dom.prefFitness.value = userPreferences.fitness || 'intermediate';
            dom.prefSweat.value = userPreferences.sweat || 'average';
        }
    } catch (e) { /* Error handled in a more generic way below */ }
}

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
        userPreferences = { ...preferences, username };
        showNotification("Preferences saved successfully!");
        setupUserProfile(currentUser); // Update display name
    } catch (error) { console.error("Error saving preferences:", error); showNotification("Could not save preferences.", true); }
});

// --- PLAN MANAGEMENT (SAVE, LOAD, UPDATE, DELETE) ---
dom.savePlanBtn.addEventListener('click', () => {
    if (!currentUser) { showNotification("Please sign in to save a plan.", true); return; }
    if (!currentPlan.splits || currentPlan.splits.length === 0) { showNotification("Please generate a plan before saving.", true); return; }

    dom.planNameInput.value = (currentlyEditingPlanId && currentPlan.name !== "Untitled Race Plan") ? currentPlan.name : "";
    dom.planDateInput.value = currentPlan.raceDate || "";
    dom.planNotesInput.value = currentPlan.notes || "";

    dom.saveModalError.textContent = '';
    dom.makePublicToggle.checked = false; // Default to private
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
        loadUserPlans(currentUser.uid);
    } catch (error) {
        console.error("Error saving/updating plan:", error);
        dom.saveModalError.textContent = "Could not save plan. Check console for details.";
    } finally {
        dom.confirmSaveBtn.disabled = false; dom.confirmSaveBtn.textContent = 'Save';
    }
});

async function loadUserPlans(userId) {
    dom.savedPlansDropdown.innerHTML = `<option>Loading plans...</option>`;
    const plansQuery = query(collection(db, "users", userId, "racePlans"));
    const querySnapshot = await getDocs(plansQuery);
    savedPlansCache = [];
    querySnapshot.forEach(doc => {
        savedPlansCache.push({ id: doc.id, ...doc.data() });
    });

    // Sort by race date (upcoming first), then by creation date for plans without a date
    savedPlansCache.sort((a, b) => {
        if (a.raceDate && b.raceDate) return new Date(a.raceDate) - new Date(b.raceDate);
        if (a.raceDate) return -1;
        if (b.raceDate) return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    dom.savedPlansDropdown.innerHTML = `<option value="">My Saved Plans</option>`;
    savedPlansCache.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        option.textContent = plan.name;
        dom.savedPlansDropdown.appendChild(option);
    });
}
dom.closeNotesModalBtn.addEventListener('click', () => dom.notesModal.classList.add('hidden'));
dom.savedPlansDropdown.addEventListener('change', (e) => {
    const planId = e.target.value;
    if (!planId) { currentlyEditingPlanId = null; return; }
    const plan = savedPlansCache.find(p => p.id === planId);
    if (plan) {
        currentlyEditingPlanId = plan.id;
        loadPlanIntoUI(plan);
    }
});

function loadPlanIntoUI(plan) {
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

// --- PUBLIC LIBRARY PAGE ---
async function renderPublicLibraryPage() {
    if (!currentUser) return;
    dom.libraryContainer.innerHTML = '<div class="spinner mx-auto"></div>';

    try {
        const [officialCoursesSnap, communityPlansSnap] = await Promise.all([
            getDocs(collection(db, "publicCourses")),
            getDocs(query(collection(db, "communityPlans"), orderBy("createdAt", "desc")))
        ]);

        dom.libraryContainer.innerHTML = ''; // Clear spinner

        // Render Official Courses
        let officialHtml = `
            <div class="col-span-full">
                <h3 class="text-2xl font-bold text-gray-100 border-b border-gray-700 pb-3 mb-4">Official Courses</h3>
            </div>
        `;
        if (officialCoursesSnap.empty) {
            officialHtml += `<p class="col-span-full text-gray-400">No official courses available yet.</p>`;
        } else {
            officialCoursesSnap.forEach(doc => {
                const course = { id: doc.id, ...doc.data() };
                officialHtml += createLibraryCard(course, true);
            });
        }
        
        // Render Community Plans
        let communityHtml = `
            <div class="col-span-full mt-10">
                <h3 class="text-2xl font-bold text-gray-100 border-b border-gray-700 pb-3 mb-4">Community Plans</h3>
            </div>
        `;
         if (communityPlansSnap.empty) {
            communityHtml += `<p class="col-span-full text-gray-400">No community plans shared yet.</p>`;
        } else {
            communityPlansSnap.forEach(doc => {
                const plan = {id: doc.id, ...doc.data()};
                communityHtml += createLibraryCard(plan, false);
            });
        }
        
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        gridWrapper.innerHTML = officialHtml + communityHtml;
        dom.libraryContainer.appendChild(gridWrapper);

        // Add event listeners after cards are in the DOM
        gridWrapper.querySelectorAll('.clone-plan-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const planData = JSON.parse(e.target.dataset.plan);
                currentlyEditingPlanId = null; 
                loadPlanIntoUI(planData);
                showView('appView');
                showNotification(`Cloned "${planData.name}". You can now modify and save it as your own.`);
            });
        });

    } catch (error) {
        console.error("Error loading library:", error);
        dom.libraryContainer.innerHTML = `<p class="col-span-full text-red-400">Could not load course library. Please check your Firestore rules and connection.</p>`;
    }
}

function createLibraryCard(plan, isOfficial) {
    const badge = isOfficial ? `<span class="text-xs font-semibold bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Official</span>` : `<span class="text-xs font-semibold bg-sky-500/20 text-sky-300 px-2 py-1 rounded-full">Community</span>`;
    const author = isOfficial ? '' : `<p class="text-sm text-gray-400 mb-4">By: ${plan.author || 'Anonymous'}</p>`;
    const distance = plan.distance || (plan.totalStats ? plan.totalStats.distance : 0);
    const gain = plan.gain || (plan.totalStats ? plan.totalStats.gain : 0);

    return `
        <div class="bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start">
                     <h4 class="text-lg font-bold text-white truncate pr-2">${plan.name}</h4>
                     ${badge}
                </div>
                ${author}
                <div class="text-sm space-y-1 text-gray-300">
                    <p><strong>Distance:</strong> ${distance.toFixed(1)} km</p>
                    <p><strong>Gain:</strong> ${gain} m</p>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button class="clone-plan-btn bg-gray-600 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors" data-plan='${JSON.stringify(plan)}'>Clone Course</button>
            </div>
        </div>
    `;
}

// --- PLAN MANAGEMENT PAGE ---
dom.managePlansBtn.addEventListener('click', () => showView('planManagementView'));
dom.backToModelerBtn.addEventListener('click', () => showView('appView'));
dom.backToModelerBtnFromProfile.addEventListener('click', () => showView('appView'));
dom.backToModelerBtnFromLibrary.addEventListener('click', () => showView('appView'));

async function renderPlanManagementPage() {
    if (!currentUser) return;
    dom.planListContainer.innerHTML = '<div class="spinner mx-auto"></div>';
    await loadUserPlans(currentUser.uid); // Refresh cache
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
            currentlyEditingPlanId = plan.id;
            loadPlanIntoUI(plan);
            showView('appView');
        });

        // Publish/Unpublish Logic
        card.querySelector('.publish-plan-btn').addEventListener('click', async () => {
            if (plan.isPublic) { // Unpublish action
                if (confirm(`Are you sure you want to make "${plan.name}" private? It will be removed from the public library.`)) {
                   try {
                        if(plan.publicPlanId) await deleteDoc(doc(db, "communityPlans", plan.publicPlanId));
                        await updateDoc(doc(db, "users", currentUser.uid, "racePlans", plan.id), { isPublic: false, publicPlanId: null });
                        showNotification("Plan successfully made private.");
                        renderPlanManagementPage();
                   } catch(e) { console.error("Error unpublishing plan:", e); showNotification("Could not unpublish plan.", true); }
                }
            } else { // Publish action
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
                        renderPlanManagementPage();
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
                    renderPlanManagementPage();
                } catch (error) { console.error("Error deleting plan:", error); showNotification("Could not delete plan.", true); }
            }
        });
        dom.planListContainer.appendChild(card);
    });
}


// --- UI, Calculations, PDF, Share, AI ---
dom.gpxFileInput.addEventListener('change', handleGpxFile);
dom.checkpointsInput.addEventListener('input', () => { dom.gpxFileInput.value = ''; currentPlan.gpxContent = null; dom.gpxStatus.textContent = ''; generateCheckpointInputs(); });
dom.calculateBtn.addEventListener('click', runCalculationsAndUpdateUI);
dom.downloadPdfBtn.addEventListener('click', downloadPdf);
dom.sharePlanBtn.addEventListener('click', () => {
    if (!currentUser) { showNotification("Please sign in to share a plan.", true); return; }
    if (!currentPlan.splits || currentPlan.splits.length === 0) { showNotification("Please generate a plan first.", true); return; }
    const planName = currentPlan.name || "Untitled Race Plan";
    dom.sharePlanNameConfirm.textContent = planName;
    dom.sharePlanModal.classList.remove('hidden');
});
dom.getAiInsightsBtn.addEventListener('click', fetchAiInsights);
[dom.targetTimeHoursInput, dom.targetTimeMinsInput, dom.pacingStrategySlider, dom.uphillEffortSlider, dom.downhillEffortSlider, dom.temperatureSlider].forEach(el => {
    el.addEventListener('input', () => { if (!dom.resultsSection.classList.contains('hidden')) { runCalculationsAndUpdateUI(); } });
});

function resetShareModal() {
    dom.sharePlanModal.classList.add('hidden');
    dom.shareSuccessView.classList.add('hidden');
    dom.shareConfirmView.classList.remove('hidden');
    dom.shareConfirmInput.value = '';
    dom.shareModalError.textContent = '';
}

dom.cancelShareBtn.addEventListener('click', resetShareModal);
dom.closeShareModalBtn.addEventListener('click', resetShareModal);

dom.confirmShareBtn.addEventListener('click', async () => {
    const planName = currentPlan.name || "Untitled Race Plan";
    if (dom.shareConfirmInput.value !== planName) { dom.shareModalError.textContent = 'The name does not match. Sharing cancelled.'; return; }
    dom.shareModalError.textContent = '';
    dom.confirmShareBtn.disabled = true; dom.confirmShareBtn.textContent = 'Uploading...';
    try {
        const pdfDoc = generatePdfDoc();
        const pdfBlob = pdfDoc.output('blob');
        const uniqueId = `${currentUser.uid}-${Date.now()}`;
        const storageRef = ref(storage, `sharedPlans/${uniqueId}.pdf`);
        await uploadBytes(storageRef, pdfBlob);
        const downloadURL = await getDownloadURL(storageRef);
        dom.shareConfirmView.classList.add('hidden');
        dom.shareableLinkInput.value = downloadURL;
        dom.shareSuccessView.classList.remove('hidden');
    } catch (error) { console.error("Error sharing plan:", error); dom.shareModalError.textContent = "Upload failed. Check storage rules.";
    } finally { dom.confirmShareBtn.disabled = false; dom.confirmShareBtn.textContent = 'Confirm & Share'; }
});

dom.copyLinkBtn.addEventListener('click', () => {
    dom.shareableLinkInput.select();
    document.execCommand('copy');
    dom.copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => { dom.copyLinkBtn.textContent = 'Copy'; }, 2000);
});

function generateCheckpointInputs() {
    const numCheckpoints = parseInt(dom.checkpointsInput.value);
    dom.checkpointInputsContainer.innerHTML = '';
    if (numCheckpoints > 0 && numCheckpoints < 51) {
        dom.strategySection.classList.remove('hidden'); dom.chartSection.classList.remove('hidden');
        for (let i = 1; i <= numCheckpoints; i++) {
            const div = document.createElement('div');
            div.className = 'grid grid-cols-1 md:grid-cols-8 gap-x-4 gap-y-2 p-4 border border-gray-700 bg-gray-900/20 rounded-lg fade-in items-center';
            div.innerHTML = `
                <h3 class="md:col-span-1 text-lg font-semibold text-gray-200">Split ${i}</h3>
                <div class="md:col-span-2 relative"><label for="distance-${i}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Distance (km)</label><input type="number" id="distance-${i}" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
                <div class="md:col-span-2 relative"><label for="gain-${i}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Gain (m)</label><input type="number" id="gain-${i}" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
                <div class="md:col-span-2 relative"><label for="loss-${i}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Loss (m)</label><input type="number" id="loss-${i}" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
                <div class="md:col-span-1 flex items-center justify-end gap-2">
                     <button data-action="add" data-index="${i}" class="text-green-400 hover:text-green-300 text-2xl font-bold leading-none" title="Add Split Below">&plus;</button>
                     <button data-action="delete" data-index="${i}" class="text-red-400 hover:text-red-300 text-2xl font-bold leading-none ${numCheckpoints > 1 ? '' : 'hidden'}" title="Delete Split">&minus;</button>
                </div>
            `;
            dom.checkpointInputsContainer.appendChild(div);
        }
        dom.checkpointInputsContainer.querySelectorAll('input').forEach(input => input.addEventListener('input', updateChartFromInputs));
    } else {
        dom.strategySection.classList.add('hidden'); dom.chartSection.classList.add('hidden');
    }
}

dom.checkpointInputsContainer.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action) return;

    const currentRows = Array.from(dom.checkpointInputsContainer.children);
    const currentIndex = parseInt(e.target.dataset.index);
    
    if (action === 'add') {
        const newRow = createSplitRow(currentIndex + 1);
        currentRows[currentIndex - 1].after(newRow);
    } else if (action === 'delete') {
        if(currentRows.length > 1) {
            currentRows[currentIndex - 1].remove();
        }
    }
    renumberSplits();
});

function createSplitRow(index) {
     const div = document.createElement('div');
     div.className = 'grid grid-cols-1 md:grid-cols-8 gap-x-4 gap-y-2 p-4 border border-gray-700 bg-gray-900/20 rounded-lg fade-in items-center';
     div.innerHTML = `
        <h3 class="md:col-span-1 text-lg font-semibold text-gray-200">Split ${index}</h3>
        <div class="md:col-span-2 relative"><label for="distance-${index}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Distance (km)</label><input type="number" id="distance-${index}" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
        <div class="md:col-span-2 relative"><label for="gain-${index}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Gain (m)</label><input type="number" id="gain-${index}" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
        <div class="md:col-span-2 relative"><label for="loss-${index}" class="absolute -top-2 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">Loss (m)</label><input type="number" id="loss-${index}" class="block w-full bg-transparent border-gray-600 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"></div>
        <div class="md:col-span-1 flex items-center justify-end gap-2">
             <button data-action="add" data-index="${index}" class="text-green-400 hover:text-green-300 text-2xl font-bold leading-none" title="Add Split Below">&plus;</button>
             <button data-action="delete" data-index="${index}" class="text-red-400 hover:text-red-300 text-2xl font-bold leading-none" title="Delete Split">&minus;</button>
        </div>
    `;
    div.querySelectorAll('input').forEach(input => input.addEventListener('input', updateChartFromInputs));
    return div;
}

function renumberSplits() {
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

function handleGpxFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    dom.gpxStatus.textContent = `Processing ${file.name}...`;
    const reader = new FileReader();
    reader.onload = (e) => processGpxContent(e.target.result, file.name);
    reader.readAsText(file);
}

function processGpxContent(gpxContent, fileName) {
    currentPlan.gpxContent = gpxContent; // Store the raw content
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

function updateChartFromInputs() {
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
}

function calculateSingleSplitTime(basePace, splitData, splitProgress, sliders) {
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

function calculateTotalTimeForPace(basePace, checkpointData, sliders) {
    let totalTime = 0, cumulativeDistance = 0;
    const totalDistance = checkpointData.reduce((acc, curr) => acc + curr.distance, 0);
    if (totalDistance <= 0) return 0;
    for (const split of checkpointData) {
        totalTime += calculateSingleSplitTime(basePace, split, cumulativeDistance / totalDistance, sliders);
        cumulativeDistance += split.distance;
    }
    return totalTime;
}

function findBestPaceForTargetTime(targetTimeInMinutes, checkpointData, sliders) {
    let basePace = 7.0; const iterations = 20;
    for (let i = 0; i < iterations; i++) {
        const calculatedTime = calculateTotalTimeForPace(basePace, checkpointData, sliders);
        if (Math.abs(calculatedTime - targetTimeInMinutes) < 0.01) break;
        if (calculatedTime > 0) basePace *= targetTimeInMinutes / calculatedTime; else { basePace = 10; break; }
    }
    return basePace;
}

function runCalculationsAndUpdateUI() {
    const numCheckpoints = parseInt(dom.checkpointsInput.value);
    if (!numCheckpoints) return false;
    const targetTime = (parseFloat(dom.targetTimeHoursInput.value) || 0) * 60 + (parseFloat(dom.targetTimeMinsInput.value) || 0);
    const sliders = { pacing: parseInt(dom.pacingStrategySlider.value), uphill: parseInt(dom.uphillEffortSlider.value), downhill: parseInt(dom.downhillEffortSlider.value), temp: parseInt(dom.temperatureSlider.value) };
    const checkpointData = Array.from({ length: numCheckpoints }, (_, i) => ({
        distance: parseFloat(document.getElementById(`distance-${i + 1}`).value) || 0,
        gain: parseFloat(document.getElementById(`gain-${i + 1}`).value) || 0,
        loss: parseFloat(document.getElementById(`loss-${i + 1}`).value) || 0,
    }));
    const totalDistance = checkpointData.reduce((sum, cp) => sum + cp.distance, 0);
    if (totalDistance <= 0 || targetTime <= 0) { dom.resultsSection.classList.add('hidden'); return false; }
    const basePace = findBestPaceForTargetTime(targetTime, checkpointData, sliders);
    generatePlanFromPace(basePace, checkpointData, sliders);
    return true;
}

function generatePlanFromPace(basePace, checkpointData, sliders) {
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
    currentPlan = {
        name: planName, 
        raceDate: dom.planDateInput.value || null,
        notes: dom.planNotesInput.value || null,
        totalStats: { distance: totalDistance, gain: totalGain, loss: totalLoss, time: formatTime(totalTime), pace: formatPace(totalPace) + " /km", carbs: totalCarbs, water: totalWater, salts: totalSalts },
        splits: splits.map((s, i) => ({ name: `Split ${i + 1} (${s.distance.toFixed(1)}km, +${s.gain}m, -${s.loss}m)`, time: formatTime(s.time), pace: `${s.pace} /km`, carbs: `${s.carbs} g`, water: `${s.water} ml`, salts: `${s.salts} mg` })),
        checkpoints: checkpointData, sliders, targetTime: { hours: dom.targetTimeHoursInput.value, mins: dom.targetTimeMinsInput.value }, gpxContent: currentPlan.gpxContent
    };
    dom.resultsSection.classList.remove('hidden'); dom.getAiInsightsBtn.classList.remove('hidden');
    dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function generatePdfDoc() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const planName = currentPlan.name || 'Race Strategy Plan';
    const totals = currentPlan.totalStats;
    const raceDate = currentPlan.raceDate ? new Date(currentPlan.raceDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';

    // Header
    doc.setFillColor(30, 41, 59); // bg-gray-800
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(planName, 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110); // text-teal-500
    doc.text(`Generated by WatchForward.co Race Modeler`, 14, 25);
    
    let yPos = 45;

    // Overview Section
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // text-green-500
    doc.text('Race Overview & Totals', 14, yPos);
    yPos += 7;
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // text-gray-700
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

    // Notes Section
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

    // Splits Table
    const tableBody = currentPlan.splits.map(s => [s.name, s.time, s.pace, s.carbs, s.water, s.salts]);
    doc.autoTable({
        startY: yPos,
        head: [['Split', 'Time', 'Pace', 'Carbs', 'Water', 'Salts']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [15, 118, 110] }, // teal-700
        styles: { font: 'Inter', cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 45 } }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, 287, { align: 'center' });
    }

    return doc;
}

function downloadPdf() {
    if (!currentPlan.splits) { showNotification("Please generate a plan first.", true); return; }
    const doc = generatePdfDoc();
    doc.save(`${(currentPlan.name || 'Race-Plan').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

async function fetchAiInsights() {
    dom.aiInsightsContainer.classList.remove('hidden'); dom.aiInsightsLoading.style.display = 'flex'; dom.aiInsightsContent.classList.add('hidden'); dom.aiInsightsError.classList.add('hidden');
    const getStrategyText = (v, o) => (v > 3 ? o[2] : v < -3 ? o[0] : o[1]);
    const systemPrompt = `You are an expert ultramarathon coach. Provide clear, encouraging, actionable advice. Analyze the race data and strategy. Generate a concise plan for **Pacing**, **Nutrition & Hydration**, and **Mental Prep**. Relate advice to the data. Format with ## headings.`;
    const userQuery = `My race plan:\n**Overview:**\n- Race Date: ${currentPlan.raceDate || 'Not set'}\n- Distance: ${currentPlan.totalStats.distance.toFixed(1)} km\n- Gain: ${currentPlan.totalStats.gain} m\n- Time: ${currentPlan.totalStats.time}\n- Temp: ${currentPlan.sliders.temp}°C\n**My Notes:** ${currentPlan.notes || 'None'}\n**Fuel Plan:**\n- Carbs: ${currentPlan.totalStats.carbs} g\n- Water: ${currentPlan.totalStats.water} ml\n- Lytes: ${currentPlan.totalStats.salts} mg\n**Strategy:**\n- Pacing: ${getStrategyText(currentPlan.sliders.pacing, ["Conservative Start", "Even Split", "Aggressive Start"])}\n- Uphills: ${getStrategyText(currentPlan.sliders.uphill, ["Conserve", "Neutral", "Push"])}\n- Downhills: ${getStrategyText(currentPlan.sliders.downhill, ["Recover", "Neutral", "Attack"])}\n**Splits:**\n${currentPlan.splits.map(s => `- ${s.name}: Time: ${s.time}, Pace: ${s.pace}`).join('\n')}`;
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

function formatTime(minutes) {
    if (minutes < 0) return "00:00:00";
    const totalSeconds = Math.round(minutes * 60);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
}

function formatPace(minutes) {
    if (minutes <= 0 || !isFinite(minutes)) return "00:00";
    const totalSeconds = Math.round(minutes * 60);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}
    </script>
</body>
</html>
