// This file controls the new index.html page

// Import the firebase services
import { db, auth, GoogleProvider } from './modules/firebase.js';

/* ================== UTILITIES ================== */
function $(id) {
    return document.getElementById(id);
}

function showToast(message, type = 'info', duration = 2000) {
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    let size = 'small';
    if (type === 'warning' || message.length > 30) size = 'medium';
    if (type === 'error' || message.length > 50) size = 'large';
    toast.className = `toast ${type} ${size}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, duration);
}

async function loadGameState(code) {
    if (!db) {
        showToast('Database not connected', 'error', 3000);
        return null;
    }
    try {
        const doc = await db.collection('games').doc(code).get();
        if (doc.exists) {
            return doc.data();
        } else {
            console.warn(`Game doc '${code}' does not exist`);
            return null;
        }
    } catch (e) {
        console.warn('Failed to load game from Firebase:', e);
        return null;
    }
}

/* ================== AUTH HANDLERS ================== */

function handleSignUp() {
    const email = $('globalSignupEmail').value;
    const password = $('globalSignupPassword').value;
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error', 3000);
        return;
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            showToast('Account created successfully!', 'success', 2000);
            // Auth state change will handle profile creation and redirect
        })
        .catch(error => {
            console.error('Sign up error:', error);
            showToast(error.message, 'error', 4000);
        });
}

function handleLogin() {
    const email = $('globalEmail').value;
    const password = $('globalPassword').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            showToast('Logged in successfully!', 'success', 2000);
            // Auth state change will handle profile check and redirect
        })
        .catch(error => {
            console.error('Login error:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                showToast('Invalid email or password.', 'error', 4000);
            } else {
                showToast(error.message, 'error', 4000);
            }
        });
}

function handleGoogleSignIn() {
    if (!GoogleProvider) {
        showToast('Google Sign-In is not available', 'error');
        return;
    }
    auth.signInWithPopup(GoogleProvider)
        .then((result) => {
            showToast(`Welcome, ${result.user.displayName}!`, 'success', 2000);
            // Auth state change will handle profile check and redirect
        }).catch((error) => {
            console.error('Google Sign-In Error:', error);
            if (error.code !== 'auth/popup-closed-by-user') {
                showToast(error.message, 'error', 4000);
            }
        });
}


function handleFreeHost() {
    // Redirect to sport selection as a guest
    window.location.href = 'sports.html?mode=free';
}

async function handleGlobalWatch() {
    const code = $('globalWatchCode').value.trim();
    if (code.length !== 6) return;

    // Check if game exists before redirecting
    const game = await loadGameState(code);
    if (game) {
        // Game exists, redirect to sport selection as a watcher
        window.location.href = `sports.html?mode=watch&code=${code}`;
    } else {
        const msg = $('globalCodeValidationMessage');
        msg.textContent = 'Game not found. Check the code.';
        msg.className = 'validation-message error';
        msg.classList.remove('hidden');
        showToast('Game not found', 'error', 3000);
    }
}

/* ================== TAB CONTROLS ================== */

function setupTabs() {
    const tabSignin = $('tab-signin');
    const tabSignup = $('tab-signup');
    const formSignin = $('signin-form');
    const formSignup = $('signup-form');

    if (tabSignin) { // Check if tabs exist on this page
        tabSignin.addEventListener('click', () => {
            tabSignin.classList.add('active');
            tabSignup.classList.remove('active');
            formSignin.classList.remove('hidden');
            formSignup.classList.add('hidden');
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            tabSignin.classList.remove('active');
            formSignup.classList.remove('hidden');
            formSignin.classList.add('hidden');
        });
    }
}

/* ================== NEW PROFILE LOGIC ================== */

/**
 * Checks for a user profile in Firestore.
 * If it doesn't exist, it creates one.
 * @param {firebase.User} user - The authenticated user object.
 */
async function checkAndCreateUserProfile(user) {
    if (!user || !db) return;

    const userRef = db.collection('users').doc(user.uid);
    
    try {
        const doc = await userRef.get();
        
        if (!doc.exists) {
            // Profile doesn't exist, create it
            console.log('Creating new user profile for:', user.uid);
            const newUserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                createdAt: new Date(),
                hostedGames: [] // Initialize as an empty array
            };
            await userRef.set(newUserProfile);
            showToast('Welcome! Your host profile has been created.', 'success', 3000);
        } else {
            // Profile exists, just log it
            console.log('User profile already exists for:', user.uid);
        }
    } catch (error) {
        console.error('Error checking/creating user profile:', error);
        showToast('Could not sync user profile.', 'error', 3000);
    }
}


/* ================== INITIALIZATION ================== */

// Listen for auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        console.log('User is logged in. Checking profile...');
        
        // --- NEW LOGIC ---
        // Check for profile *before* redirecting
        checkAndCreateUserProfile(user).then(() => {
            // Profile check/creation is done, now redirect.
            console.log('Redirecting to sport selection.');
            window.location.href = 'sports.html?mode=host';
        });
        // --- END NEW LOGIC ---

    } else {
        // User is logged out
        console.log('User is logged out, showing login page.');
    }
});

// Attach all listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auth listeners
    if ($('globalLoginBtn')) $('globalLoginBtn').addEventListener('click', handleLogin);
    if ($('globalSignupBtn')) $('globalSignupBtn').addEventListener('click', handleSignUp);
    if ($('globalFreeHostBtn')) $('globalFreeHostBtn').addEventListener('click', handleFreeHost);
    if ($('globalWatchBtn')) $('globalWatchBtn').addEventListener('click', handleGlobalWatch);
    
    // NEW Google Sign-In Listeners
    if ($('googleSignInBtn')) $('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
    if ($('googleSignUpBtn')) $('googleSignUpBtn').addEventListener('click', handleGoogleSignIn); // Both buttons do the same thing

    // NEW Tab Controls
    setupTabs();

    // Watch code input validation
    if ($('globalWatchCode')) {
        $('globalWatchCode').addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            e.target.value = value;
            $('globalWatchBtn').disabled = value.length !== 6;
            $('globalCodeValidationMessage').classList.add('hidden');
        });
    }
});