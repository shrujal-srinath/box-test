// Import the auth services from our module
import { auth, GoogleProvider } from './modules/firebase.js';

// Get access to the global utilities
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

// --- Auth View Management ---

// This is the single container we will fill
const authViewContainer = $('auth-view-container');

function showLoginView() {
    authViewContainer.innerHTML = `
        <div class="card-icon">🎯</div>
        <h3>Host with Account</h3>
        <p>Sign in to save and sync your game data.</p>
        
        <button id="googleSignInBtn" class="btn btn--google btn--full-width">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></g></svg>
            <span>Sign in with Google</span>
        </button>

        <div class="form-separator">
            <span>or</span>
        </div>

        <div class="form-group">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" type="email" class="form-control" placeholder="host@email.com">
        </div>
        <div class="form-group">
            <label for="loginPassword">Password</label>
            <input id="loginPassword" type="password" class="form-control" placeholder="Password">
        </div>
        <button id="forgotPasswordBtn" class="btn btn--forgot">Forgot Password?</button>
        
        <div class="auth-buttons" style="margin-top: 16px;">
            <button id="loginBtn" class="btn btn--primary btn--full-width">Login</button>
        </div>
        <button id="showSignUpFromLogin" class="btn btn--link">Need an account? Sign Up</button>
    `;
    
    // Attach listeners
    $('loginBtn').addEventListener('click', handleEmailLogin);
    $('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
    $('showSignUpFromLogin').addEventListener('click', showSignUpView);
    $('forgotPasswordBtn').addEventListener('click', showForgotPasswordView);
}

function showSignUpView() {
    authViewContainer.innerHTML = `
        <div class="card-icon">🎯</div>
        <h3>Create Account</h3>
        <p>Save and sync your game data for free.</p>
        
        <button id="googleSignInBtn" class="btn btn--google btn--full-width">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></g></svg>
            <span>Sign up with Google</span>
        </button>

        <div class="form-separator">
            <span>or</span>
        </div>

        <div class="form-group">
            <label for="signupEmail">Email</label>
            <input id="signupEmail" type="email" class="form-control" placeholder="host@email.com">
        </div>
        <div class="form-group">
            <label for="signupPassword">Password</label>
            <input id="signupPassword" type="password" class="form-control" placeholder="Min. 6 characters">
        </div>
        <div class="form-group">
            <label for="signupConfirmPassword">Confirm Password</label>
            <input id="signupConfirmPassword" type="password" class="form-control" placeholder="Re-type password">
        </div>
        <div class="auth-buttons" style="margin-top: 16px;">
            <button id="signupBtn" class="btn btn--primary btn--full-width">Create Account</button>
        </div>
        <button id="showLoginFromSignUp" class="btn btn--link">Have an account? Sign In</button>
    `;
    
    // Attach listeners
    $('signupBtn').addEventListener('click', handleEmailSignUp);
    $('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
    $('showLoginFromSignUp').addEventListener('click', showLoginView);
}

function showForgotPasswordView() {
    authViewContainer.innerHTML = `
        <div class="card-icon">🔑</div>
        <h3>Reset Password</h3>
        <p>Enter your email and we'll send you a reset link.</p>
        
        <div class="form-group">
            <label for="resetEmail">Email</label>
            <input id="resetEmail" type="email" class="form-control" placeholder="host@email.com">
        </div>
        
        <div class="auth-buttons" style="margin-top: 16px;">
            <button id="sendResetBtn" class="btn btn--primary btn--full-width">Send Reset Email</button>
        </div>
        <button id="backToLogin" class="btn btn--link">← Back to Login</button>
    `;

    // Attach listeners
    $('sendResetBtn').addEventListener('click', handleForgotPassword);
    $('backToLogin').addEventListener('click', showLoginView);
}


// --- Auth Actions ---

function handleEmailSignUp() {
    const email = $('signupEmail').value;
    const password = $('signupPassword').value;
    const confirmPassword = $('signupConfirmPassword').value;

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error', 3000);
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error', 3000);
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            showToast('Account created successfully!', 'success', 2000);
            // Redirection is handled by onAuthStateChanged
        })
        .catch(error => {
            console.error('Sign up error:', error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Email already in use. Please sign in.', 'error', 4000);
            } else {
                showToast(error.message, 'error', 4000);
            }
        });
}

function handleEmailLogin() {
    const email = $('loginEmail').value;
    const password = $('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            showToast('Logged in successfully!', 'success', 2000);
            // Redirection is handled by onAuthStateChanged
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
    auth.signInWithPopup(GoogleProvider)
        .then((result) => {
            showToast(`Welcome, ${result.user.displayName}!`, 'success', 2000);
            // Redirection is handled by onAuthStateChanged
        }).catch((error) => {
            console.error('Google Sign-In Error:', error);
            // Handle common errors like "popup closed by user"
            if (error.code !== 'auth/popup-closed-by-user') {
                showToast(error.message, 'error', 4000);
            }
        });
}

function handleForgotPassword() {
    const email = $('resetEmail').value;
    if (!email) {
        showToast('Please enter your email address.', 'warning');
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => {
            showToast('Password reset email sent! Check your inbox.', 'success', 4000);
            showLoginView(); // Send them back to the login screen
        })
        .catch((error) => {
            console.error('Forgot Password Error:', error);
            showToast(error.message, 'error', 4000);
        });
}

function handleFreeHost() {
    localStorage.setItem('userIsHost', 'false');
    localStorage.setItem('userMode', 'free');
    window.location.href = 'sport-select.html';
}

// --- Initialization ---

// Listen for the user's login status
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in!
        localStorage.setItem('userIsHost', 'true');
        localStorage.setItem('userMode', 'host');
        
        // Redirect to sport selection
        showToast('Redirecting...', 'info', 1000);
        setTimeout(() => {
            window.location.href = 'sport-select.html';
        }, 1000);
        
    } else {
        // User is logged out.
        localStorage.setItem('userIsHost', 'false');
        localStorage.setItem('userMode', 'guest');
        
        // Show the main "Login" view
        showLoginView();
    }
});

// Attach listener for the "Free Host" button
$('freeHostBtn').addEventListener('click', handleFreeHost);