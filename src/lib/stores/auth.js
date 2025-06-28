import { writable } from "svelte/store"
import { auth, isFirebaseConfigured } from "$lib/firebase.js"
import { onAuthStateChanged, signInAnonymously, updateProfile } from "firebase/auth"
import { browser } from "$app/environment"

export const user = writable(null)
export const loading = writable(true)
export const firebaseError = writable(null)

if (browser) {
  if (!isFirebaseConfigured()) {
    loading.set(false)
    firebaseError.set("Firebase not configured. Please check your Firebase setup.")
  } else if (auth) {
    onAuthStateChanged(
      auth,
      (firebaseUser) => {
        user.set(firebaseUser)
        loading.set(false)
        firebaseError.set(null)
      },
      (error) => {
        console.error("Auth state change error:", error)
        firebaseError.set(error.message)
        loading.set(false)
      },
    )
  } else {
    loading.set(false)
    firebaseError.set("Firebase authentication not available")
  }
}

export async function signInAnonymous() {
  if (!auth) {
    throw new Error("Firebase Auth not initialized")
  }

  if (!isFirebaseConfigured()) {
    throw new Error("Firebase not configured. Please update your Firebase config.")
  }

  try {
    const result = await signInAnonymously(auth)
    return result.user
  } catch (error) {
    console.error("Anonymous sign in failed:", error)
    throw new Error(`Sign in failed: ${error.message}`)
  }
}

export async function updateUserProfile(displayName, email, phone) {
  if (!auth?.currentUser) {
    throw new Error("No authenticated user")
  }

  try {
    await updateProfile(auth.currentUser, {
      displayName: displayName,
    })
    return auth.currentUser
  } catch (error) {
    console.error("Profile update failed:", error)
    throw error
  }
}
