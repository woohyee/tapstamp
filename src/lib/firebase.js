import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { browser } from "$app/environment"

// TODO: Replace with your actual Firebase config from Firebase Console
// Go to Project Settings > General > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "AIzaSyAp1dWqp7-wxfzY4amkBPNafE32tuVdC1c",
  authDomain: "happy-stamp-book.firebaseapp.com",
  projectId: "happy-stamp-book",
  storageBucket: "happy-stamp-book.firebasestorage.app",
  messagingSenderId: "950182875371",
  appId: "1:950182875371:web:569503b5d5b71bfa926eae",
};


// Check if Firebase is properly configured
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "your-api-key-here" && firebaseConfig.projectId !== "your-project-id"
}

let app
let auth
let db

if (browser) {
  if (!isFirebaseConfigured()) {
    console.error("🔥 Firebase not configured! Please update src/lib/firebase.js with your actual Firebase config.")
    console.error("📖 Instructions: https://firebase.google.com/docs/web/setup")
  } else {
    try {
      app = initializeApp(firebaseConfig)
      auth = getAuth(app)
      db = getFirestore(app)
      console.log("🔥 Firebase initialized successfully!")
    } catch (error) {
      console.error("🔥 Firebase initialization failed:", error)
    }
  }
}

export { auth, db, isFirebaseConfigured }
