// Import all the Firebase services we need from the CDN
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-check-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js";

// YOUR NEW, CORRECT CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCOxfphialDsr8jrwU7Cad2bfakM_2n1H0", // PLEASE ROTATE THIS KEY
  authDomain: "bmsce-box.firebaseapp.com",
  projectId: "bmsce-box",
  storageBucket: "bmsce-box.firebasestorage.app",
  messagingSenderId: "705333337179",
  appId: "1:705333337179:web:9018e93764205c6f33337e",
  measurementId: "G-P6VC5RQRDY"
};

// Initialize Firebase
let db;
let auth;
let GoogleProvider;
let firebase; // <-- NEW: Declare firebase

try {
  // The CDN import places 'firebase' on the window object
  firebase = window.firebase; // <-- NEW: Assign it
  firebase.initializeApp(firebaseConfig);
  
  // --- START NEW SECURITY CHECK: Only use debug token on localhost ---
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = "5790a0e7-e070-43b9-a418-44d1819c3132"; 
    console.log("App Check running in DEBUG mode.");
  }
  // --- END NEW SECURITY CHECK ---

  // You must initialize the appCheck service for the debug token to be used
  firebase.appCheck(); 
  
  // Initialize services
  db = firebase.firestore();
  auth = firebase.auth();
  
  // Initialize the Google provider
  GoogleProvider = new firebase.auth.GoogleAuthProvider();

  console.log("Firebase services initialized successfully from module.");
  // Removed the debug mode log from the end since it's now in the check

} catch (e) {
  console.error("Firebase initialization failed:", e);
  alert("Could not connect to the database.");
}

// Export the services so other files can import them
export { db, auth, GoogleProvider, firebase };