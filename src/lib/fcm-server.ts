// FCM 서버 라이브러리
// 서버에서 관리자에게 푸시 알림 발송

import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

// FCM 서버 키 (Firebase Console에서 생성)
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY

interface CouponNotificationData {
  customer_name: string
  customer_phone: string
  coupon_value: number
  coupon_type: string
  used_at: string
}

interface FCMResponse {
  success: boolean
  message_id?: string
  error?: string
  delivery_time_ms: number
}

// 관리자에게 쿠폰 사용 푸시 알림 발송
export async function sendCouponUsedNotification(data: CouponNotificationData): Promise<FCMResponse> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 관리자에게 FCM 푸시 알림 발송 중...')
    console.log('📊 알림 데이터:', data)

    // Firebase에서 관리자 FCM 토큰 가져오기
    const adminTokenDoc = await getDoc(doc(db, 'admin_fcm_tokens', 'main_admin'))
    
    if (!adminTokenDoc.exists()) {
      throw new Error('관리자 FCM 토큰이 등록되지 않음')
    }

    const { fcm_token } = adminTokenDoc.data()
    if (!fcm_token) {
      throw new Error('FCM 토큰이 비어있음')
    }

    console.log('✅ 관리자 FCM 토큰 확인:', fcm_token.substring(0, 20) + '...')

    // FCM 푸시 알림 페이로드 구성
    const payload = {
      to: fcm_token,
      priority: 'high', // 높은 우선순위로 즉시 전송
      notification: {
        title: '🎫 쿠폰 사용됨!',
        body: `${data.customer_name} - ${data.coupon_value}% 할인 쿠폰 사용`,
        icon: '/icons/admin-192.png',
        badge: '/icons/admin-72.png',
        tag: 'coupon-alert', // 동일한 태그로 알림 그룹화
        requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
        vibrate: [300, 200, 300] // 진동 패턴
      },
      data: {
        type: 'coupon_used',
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        coupon_value: data.coupon_value.toString(),
        coupon_type: data.coupon_type,
        used_at: data.used_at,
        click_action: '/admin' // 알림 클릭 시 이동할 페이지
      },
      webpush: {
        headers: {
          Urgency: 'high' // 웹푸시 긴급도 설정
        },
        fcm_options: {
          link: '/admin' // 알림 클릭 시 이동할 URL
        }
      }
    }

    console.log('📤 FCM 서버로 푸시 전송 중...')

    // Google FCM 서버로 푸시 알림 요청
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    const deliveryTime = Date.now() - startTime

    console.log('📋 FCM 응답:', result)
    console.log(`⏱️ 전송 시간: ${deliveryTime}ms`)

    // FCM 응답 처리
    if (response.ok && result.success === 1) {
      console.log('✅ FCM 푸시 알림 발송 성공!')
      return {
        success: true,
        message_id: result.multicast_id?.toString(),
        delivery_time_ms: deliveryTime
      }
    } else {
      const error = result.results?.[0]?.error || result.error || 'FCM 발송 실패'
      console.error('❌ FCM 푸시 알림 발송 실패:', error)
      return {
        success: false,
        error: error,
        delivery_time_ms: deliveryTime
      }
    }

  } catch (error) {
    const deliveryTime = Date.now() - startTime
    console.error('❌ FCM 푸시 알림 발송 에러:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      delivery_time_ms: deliveryTime
    }
  }
}

// FCM 연결 상태 테스트
export async function testFCMConnection(): Promise<boolean> {
  try {
    console.log('🔍 FCM 연결 테스트 중...')
    
    const testData: CouponNotificationData = {
      customer_name: '테스트 고객',
      customer_phone: '010-1234-5678',
      coupon_value: 10,
      coupon_type: 'discount_10',
      used_at: new Date().toISOString()
    }

    const result = await sendCouponUsedNotification(testData)
    
    if (result.success) {
      console.log('✅ FCM 연결 테스트 성공!')
      return true
    } else {
      console.error('❌ FCM 연결 테스트 실패:', result.error)
      return false
    }
  } catch (error) {
    console.error('❌ FCM 연결 테스트 에러:', error)
    return false
  }
}