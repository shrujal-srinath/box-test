// Import all the Firebase services we need from the CDN
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-check-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js";

// YOUR NEW, CORRECT CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCOxfphialDsr8jrwU7Cad2bfakM_2n1H0",
  authDomain: "bmsce-box.firebaseapp.com",
  projectId: "bmsce-box",
  storageBucket: "bmsce-box.firebasestorage.app",
  messagingSenderId: "705333337179",
  appId: "1:705333337179:web:9018e93764205c6f33337e",
  measurementId: "G-P6VC5RQRDY"
};

// This is your correct debug token for 127.0.0.1
self.FIREBASE_APPCHECK_DEBUG_TOKEN = "5790a0e7-e070-43b9-a418-44d1819c3132"; 

// Initialize Firebase
let db;
let auth;
let GoogleProvider; // For Google Sign-In

try {
  firebase.initializeApp(firebaseConfig);
  
  // Initialize services
  db = firebase.firestore();
  auth = firebase.auth();
  
  // Initialize the Google provider
  GoogleProvider = new firebase.auth.GoogleAuthProvider();

  console.log("Firebase services initialized successfully from module.");
  console.log("App Check is in DEBUG MODE.");

} catch (e) {
  console.error("Firebase initialization failed:", e);
  alert("Could not connect to the database.");
}

// Export the services so other files can import them
export { db, auth, GoogleProvider };