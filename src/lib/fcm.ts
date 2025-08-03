// Firebase Cloud Messaging (FCM) Configuration
// For INSTANT real-time notifications

import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase config (using existing project)
const firebaseConfig = {
  // This will use the existing Firebase config from your project
  // We'll use the same config as the existing Firebase setup
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Initialize Firebase (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// FCM Web Push Certificate Key (VAPID)
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY

// Get FCM messaging instance
export const getMessagingInstance = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    return getMessaging(app)
  }
  return null
}

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    console.log('🔔 Requesting notification permission...')
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('❌ This browser does not support notifications')
      return null
    }
    
    // Request permission
    const permission = await Notification.requestPermission()
    console.log('📋 Notification permission:', permission)
    
    if (permission !== 'granted') {
      console.error('❌ Notification permission denied')
      return null
    }
    
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/admin'
    })
    console.log('✅ Service Worker registered:', registration)
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready
    console.log('✅ Service Worker ready')
    
    // Get FCM messaging instance
    const messaging = getMessagingInstance()
    if (!messaging) {
      console.error('❌ FCM messaging not available')
      return null
    }
    
    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    })
    
    if (token) {
      console.log('🎯 FCM Token obtained:', token)
      
      // Store token in localStorage for persistence
      localStorage.setItem('fcm_token', token)
      localStorage.setItem('fcm_token_timestamp', Date.now().toString())
      
      return token
    } else {
      console.error('❌ No FCM token received')
      return null
    }
    
  } catch (error) {
    console.error('❌ Error getting FCM token:', error)
    return null
  }
}

// Setup foreground message listener
export const setupForegroundMessageListener = () => {
  const messaging = getMessagingInstance()
  if (!messaging) return
  
  onMessage(messaging, (payload) => {
    console.log('📨 Foreground message received:', payload)
    
    // Show custom notification for foreground messages
    if (payload.notification) {
      const { title, body, icon } = payload.notification
      
      // Create prominent in-app notification
      showInAppNotification({
        title: title || '🎫 TapStamp Alert',
        body: body || 'New coupon activity',
        icon: icon || '/icons/admin-192.png',
        data: payload.data
      })
    }
  })
}

// Show in-app notification (for when app is in foreground)
const showInAppNotification = (notificationData: {
  title: string;
  body: string;
  icon?: string;
  data?: unknown;
}) => {
  console.log('🚨 Showing in-app notification:', notificationData)
  
  // Create notification element
  const notification = document.createElement('div')
  notification.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-bounce'
  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="text-2xl mr-2">🎫</div>
        <div>
          <div class="font-bold">${notificationData.title}</div>
          <div class="text-sm">${notificationData.body}</div>
        </div>
      </div>
      <button class="ml-4 text-xl hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `
  
  // Add to page
  document.body.appendChild(notification)
  
  // Play notification sound
  playNotificationSound()
  
  // Add vibration for mobile
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200])
  }
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 8000)
}

// Play notification sound
const playNotificationSound = () => {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configure sound (urgent alert tone)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
    
    console.log('🔊 Notification sound played')
  } catch (error) {
    console.error('❌ Error playing notification sound:', error)
  }
}

// Check if FCM token exists and is valid
export const getStoredFCMToken = (): string | null => {
  const token = localStorage.getItem('fcm_token')
  const timestamp = localStorage.getItem('fcm_token_timestamp')
  
  if (!token || !timestamp) return null
  
  // Check if token is less than 30 days old
  const tokenAge = Date.now() - parseInt(timestamp)
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  
  if (tokenAge > thirtyDays) {
    console.log('🔄 FCM token expired, need to refresh')
    localStorage.removeItem('fcm_token')
    localStorage.removeItem('fcm_token_timestamp')
    return null
  }
  
  return token
}

// Send FCM token to server for storage
export const registerFCMToken = async (token: string): Promise<boolean> => {
  try {
    console.log('📤 Registering FCM token with server...')
    
    const response = await fetch('/api/admin/fcm/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fcm_token: token,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ FCM token registered successfully')
      localStorage.setItem('fcm_registered', 'true')
      return true
    } else {
      console.error('❌ Failed to register FCM token:', result.error)
      return false
    }
    
  } catch (error) {
    console.error('❌ Error registering FCM token:', error)
    return false
  }
}

// Check if token is registered on server
const checkTokenRegisteredOnServer = async (token: string): Promise<boolean> => {
  try {
    console.log('🔍 Checking if FCM token is registered on server...')
    const response = await fetch('/api/admin/fcm/register', {
      method: 'GET'
    })
    const result = await response.json()
    
    if (result.success && result.token_preview) {
      console.log('✅ FCM token confirmed on server')
      return true
    }
    console.log('❌ FCM token not found on server')
    return false
  } catch (error) {
    console.error('❌ Error checking server token status:', error)
    return false
  }
}

// Initialize FCM for admin
export const initializeAdminFCM = async (): Promise<boolean> => {
  try {
    console.log('🚀 Initializing Admin FCM...')
    
    // Get existing token (if any)
    let token = getStoredFCMToken()
    
    // If we have a token, check if it's registered on server
    if (token) {
      const serverRegistered = await checkTokenRegisteredOnServer(token)
      if (serverRegistered) {
        console.log('✅ FCM already initialized and registered on server')
        setupForegroundMessageListener()
        return true
      }
      console.log('⚠️ Token exists locally but not on server, re-registering...')
    }
    
    // Get new token if we don't have one
    if (!token) {
      token = await requestNotificationPermission()
      if (!token) {
        console.error('❌ Failed to get FCM token')
        return false
      }
    }
    
    // Register token with server (always check server state)
    const registered = await registerFCMToken(token)
    if (!registered) {
      console.error('❌ Failed to register FCM token')
      return false
    }
    
    // Setup message listener
    setupForegroundMessageListener()
    
    console.log('🎉 Admin FCM initialized successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Error initializing Admin FCM:', error)
    return false
  }
}