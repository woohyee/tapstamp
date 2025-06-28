import { dev } from "$app/environment"

// Register service worker for PWA
if ("serviceWorker" in navigator && !dev) {
  navigator.serviceWorker.register("/service-worker.js")
}
