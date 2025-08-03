// FCM 클라이언트 라이브러리
// 관리자 브라우저에서 FCM 토큰 생성 및 푸시 알림 수신

import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Firebase 앱 초기화
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// VAPID 키 (Firebase Console에서 생성)
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY

// FCM 토큰 생성 및 등록 (타임아웃 포함)
export async function initializeFCM(): Promise<string | null> {
  try {
    console.log('🚀 FCM 초기화 시작...')
    
    // 브라우저 환경 확인
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.error('❌ Service Worker를 지원하지 않는 환경')
      return null
    }

    // 알림 권한 요청
    console.log('📋 알림 권한 요청 중...')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.error('❌ 알림 권한이 거부됨:', permission)
      return null
    }
    console.log('✅ 알림 권한 승인됨')

    // Service Worker 등록 (타임아웃 10초)
    console.log('🔧 Service Worker 등록 중...')
    const registration = await Promise.race([
      navigator.serviceWorker.register('/sw.js', { scope: '/admin' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker 등록 타임아웃')), 10000))
    ]) as ServiceWorkerRegistration
    
    await navigator.serviceWorker.ready
    console.log('✅ Service Worker 등록 완료')

    // FCM 메시징 인스턴스 생성
    console.log('🔥 Firebase 메시징 인스턴스 생성 중...')
    const messaging = getMessaging(app)
    console.log('✅ Firebase 메시징 인스턴스 생성 완료')

    // VAPID 키 확인
    if (!VAPID_KEY) {
      console.error('❌ VAPID 키가 설정되지 않음')
      return null
    }
    console.log('🔑 VAPID 키 확인됨:', VAPID_KEY.substring(0, 20) + '...')

    // FCM 토큰 생성 (타임아웃 15초)
    console.log('🎯 FCM 토큰 생성 중...')
    const token = await Promise.race([
      getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FCM 토큰 생성 타임아웃')), 15000))
    ]) as string

    if (!token) {
      console.error('❌ FCM 토큰 생성 실패 - 빈 토큰')
      return null
    }

    console.log('✅ FCM 토큰 생성 성공:', token.substring(0, 20) + '...')

    // 서버에 토큰 등록
    console.log('📤 서버에 토큰 등록 중...')
    const registered = await registerTokenWithServer(token)
    if (!registered) {
      console.error('❌ 서버 토큰 등록 실패')
      return null
    }

    // 포그라운드 메시지 리스너 설정
    setupForegroundMessageListener(messaging)

    console.log('🎉 FCM 초기화 완료!')
    return token

  } catch (error) {
    console.error('❌ FCM 초기화 실패:', error)
    
    // 상세한 에러 정보 출력
    if (error instanceof Error) {
      console.error('📋 에러 메시지:', error.message)
      console.error('📋 에러 스택:', error.stack)
    }
    
    return null
  }
}

// 서버에 FCM 토큰 등록
async function registerTokenWithServer(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/fcm/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      console.log('✅ 서버에 FCM 토큰 등록 완료')
      return true
    } else {
      console.error('❌ 서버 토큰 등록 실패:', result.error)
      return false
    }
  } catch (error) {
    console.error('❌ 서버 토큰 등록 에러:', error)
    return false
  }
}

// 포그라운드 푸시 메시지 수신 리스너
function setupForegroundMessageListener(messaging: any) {
  onMessage(messaging, (payload) => {
    console.log('📨 포그라운드 푸시 메시지 수신:', payload)
    
    // 쿠폰 사용 알림 처리
    if (payload.data?.type === 'coupon_used') {
      showCouponNotification({
        customer_name: payload.data.customer_name,
        customer_phone: payload.data.customer_phone,
        coupon_value: parseInt(payload.data.coupon_value),
        used_at: payload.data.used_at
      })
    }
  })
}

// 쿠폰 사용 알림 표시
function showCouponNotification(data: {
  customer_name: string
  customer_phone: string
  coupon_value: number
  used_at: string
}) {
  console.log('🚨 쿠폰 사용 알림 표시:', data)
  
  // 커스텀 이벤트로 관리자 페이지에 알림 전달
  const event = new CustomEvent('fcm-coupon-used', {
    detail: {
      id: `fcm_${Date.now()}`,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      value: data.coupon_value,
      used_at: data.used_at,
      type: `discount_${data.coupon_value}`
    }
  })
  window.dispatchEvent(event)

  // 알림 소리 재생
  playNotificationSound()
}

// 알림 소리 재생
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // 3번 반복되는 알림음
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        oscillator.frequency.value = 1000 + (i * 200)
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        
        const newOscillator = audioContext.createOscillator()
        const newGainNode = audioContext.createGain()
        
        newOscillator.connect(newGainNode)
        newGainNode.connect(audioContext.destination)
        
        newOscillator.frequency.value = 1000 + (i * 200)
        newOscillator.type = 'sine'
        newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        
        newOscillator.start()
        newOscillator.stop(audioContext.currentTime + 0.3)
      }, i * 400)
    }
  } catch (error) {
    console.log('⚠️ 오디오 재생 불가:', error)
  }
}