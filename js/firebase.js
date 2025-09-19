import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, query, orderBy, serverTimestamp, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail };
export { collection, addDoc, getDocs, doc, query, orderBy, serverTimestamp, updateDoc, deleteDoc, setDoc, getDoc };
export { ref, uploadBytes, getDownloadURL };

export async function loadUserPlans(userId, savedPlansCache, dom) {
    dom.savedPlansDropdown.innerHTML = `<option>Loading plans...</option>`;
    const plansQuery = query(collection(db, "users", userId, "racePlans"));
    const querySnapshot = await getDocs(plansQuery);
    savedPlansCache.length = 0;
    querySnapshot.forEach(doc => {
        savedPlansCache.push({ id: doc.id, ...doc.data() });
    });

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

export async function savePlan(planData, currentUser) {
    const docRef = await addDoc(collection(db, "users", currentUser.uid, "racePlans"), planData);
    return docRef.id;
}

export async function renderPublicLibraryPage(dom, currentUser, loadPlanIntoUI, showView, showNotification) {
    if (!currentUser) return;
    dom.libraryContainer.innerHTML = '<div class="spinner mx-auto"></div>';

    try {
        const [officialCoursesSnap, communityPlansSnap] = await Promise.all([
            getDocs(collection(db, "publicCourses")),
            getDocs(query(collection(db, "communityPlans"), orderBy("createdAt", "desc")))
        ]);

        dom.libraryContainer.innerHTML = '';

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

        gridWrapper.querySelectorAll('.clone-plan-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const planData = JSON.parse(e.target.dataset.plan);
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

export async function loadUserPreferences(userId, userPreferences, dom) {
    const docRef = doc(db, "users", userId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            Object.assign(userPreferences, data.preferences || {});
            userPreferences.username = data.username || null;
            dom.prefUsername.value = userPreferences.username || '';
            dom.prefWeight.value = userPreferences.weight || '';
            dom.prefHeight.value = userPreferences.height || '';
            dom.prefFitness.value = userPreferences.fitness || 'intermediate';
            dom.prefSweat.value = userPreferences.sweat || 'average';
        }
    } catch (e) { /* Error handled in a more generic way below */ }
}