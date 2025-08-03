// TapStamp Admin PWA Service Worker
// Version: 1.0

const CACHE_NAME = 'tapstamp-admin-v1'
const urlsToCache = [
  '/admin',
  '/manifest.json'
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('📱 TapStamp Admin PWA installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('📦 Caching essential files')
        
        // 각 URL을 개별적으로 캐시 (존재하지 않는 파일 무시)
        for (const url of urlsToCache) {
          try {
            await cache.add(url)
            console.log('✅ Cached:', url)
          } catch (error) {
            console.log('⚠️ Failed to cache (ignored):', url, error.message)
          }
        }
      })
  )
  
  // Take control immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ TapStamp Admin PWA activated')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all pages
  self.clients.claim()
})

// Push event - handle FCM notifications
self.addEventListener('push', (event) => {
  console.log('🔔 FCM 푸시 알림 수신:', event)
  
  let notificationData = {
    title: '🎫 쿠폰 사용됨!',
    body: '새로운 쿠폰 사용 알림',
    icon: '/icons/admin-192.png',
    badge: '/icons/admin-72.png',
    vibrate: [300, 200, 300],
    tag: 'coupon-alert',
    requireInteraction: true,
    data: {}
  }
  
  // FCM 페이로드 파싱
  if (event.data) {
    try {
      const payload = event.data.json()
      console.log('📨 FCM 페이로드:', payload)
      
      // 알림 메시지 설정
      if (payload.notification) {
        notificationData.title = payload.notification.title || notificationData.title
        notificationData.body = payload.notification.body || notificationData.body
      }
      
      // 쿠폰 데이터 저장
      if (payload.data) {
        notificationData.data = payload.data
        console.log('🎫 쿠폰 데이터:', payload.data)
      }
      
    } catch (error) {
      console.error('❌ FCM 페이로드 파싱 에러:', error)
    }
  }
  
  // 백그라운드 알림 표시
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event)
  
  const notification = event.notification
  const action = event.action
  
  // Close notification
  notification.close()
  
  if (action === 'dismiss') {
    console.log('❌ Notification dismissed')
    return
  }
  
  // Handle click - open admin page
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if admin page is already open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          console.log('🎯 Focusing existing admin page')
          return client.focus()
        }
      }
      
      // Open new admin page
      if (clients.openWindow) {
        console.log('🆕 Opening new admin page')
        return clients.openWindow('/admin')
      }
    })
  )
})

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'coupon-sync') {
    event.waitUntil(
      // Handle offline coupon data sync
      console.log('📊 Syncing offline coupon data...')
    )
  }
})

// Fetch event - basic caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle admin-related requests
  if (!event.request.url.includes('/admin')) {
    return
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('📦 Serving from cache:', event.request.url)
          return response
        }
        
        // Fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache if not successful
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          
          // Cache successful responses
          const responseToCache = response.clone()
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })
          
          return response
        }).catch(() => {
          // Return offline page if available
          if (event.request.destination === 'document') {
            return caches.match('/admin/offline')
          }
        })
      })
  )
})

// Error handling
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason)
})

console.log('🚀 TapStamp Admin Service Worker loaded successfully')