// Firebase Cloud Messaging Admin SDK
// For sending INSTANT push notifications from server

import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

// FCM Server Key (from Firebase Console)
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY

interface NotificationData {
  customer_name: string
  customer_phone: string
  coupon_type: string
  coupon_value: number
  used_at: string
}

interface FCMResponse {
  success: boolean
  message_id?: string
  error?: string
  delivery_time?: number
}

// Send FCM push notification to admin
export async function sendAdminNotification(notificationData: NotificationData): Promise<FCMResponse> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Sending INSTANT FCM notification...')
    
    // Get admin FCM token from database
    const adminFCMDoc = await getDoc(doc(db, 'admin_fcm_tokens', 'main_admin'))
    
    if (!adminFCMDoc.exists()) {
      throw new Error('No admin FCM token registered')
    }
    
    const { fcm_token } = adminFCMDoc.data()
    
    if (!fcm_token) {
      throw new Error('Admin FCM token is empty')
    }
    
    // Prepare notification payload
    const payload = {
      to: fcm_token,
      priority: 'high',
      notification: {
        title: '🎫 Coupon Used!',
        body: `${notificationData.customer_name} - ${notificationData.coupon_value}% OFF`,
        icon: '/icons/admin-192.png',
        badge: '/icons/admin-72.png',
        tag: 'coupon-alert',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300]
      },
      data: {
        type: 'coupon_used',
        customer_name: notificationData.customer_name,
        customer_phone: notificationData.customer_phone,
        coupon_type: notificationData.coupon_type,
        coupon_value: notificationData.coupon_value.toString(),
        used_at: notificationData.used_at,
        click_action: '/admin'
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        fcm_options: {
          link: '/admin'
        }
      }
    }
    
    // Send FCM notification
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
    
    console.log('📊 FCM Response:', result)
    console.log(`⏱️ FCM delivery time: ${deliveryTime}ms`)
    
    if (response.ok && result.success === 1) {
      console.log('✅ FCM notification sent successfully!')
      return {
        success: true,
        message_id: result.multicast_id,
        delivery_time: deliveryTime
      }
    } else {
      const error = result.results?.[0]?.error || 'Unknown FCM error'
      console.error('❌ FCM notification failed:', error)
      return {
        success: false,
        error: error,
        delivery_time: deliveryTime
      }
    }
    
  } catch (error) {
    const deliveryTime = Date.now() - startTime
    console.error('❌ FCM notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      delivery_time: deliveryTime
    }
  }
}

// Send urgent SMS notification (backup) - NOW WITH REAL TWILIO
export async function sendSMSNotification(notificationData: NotificationData): Promise<boolean> {
  try {
    console.log('📱 Sending REAL SMS backup notification...')
    
    // Import SMS functionality
    const { sendSMSNotification: sendSMS, checkSMSLimits } = await import('@/lib/sms')
    
    // Check SMS limits before sending
    const limitsOk = await checkSMSLimits()
    if (!limitsOk) {
      console.log('⚠️ SMS limits reached, skipping SMS')
      return false
    }
    
    // Send actual SMS via Twilio
    const smsResult = await sendSMS(notificationData)
    
    if (smsResult.success) {
      console.log('✅ REAL SMS sent successfully!')
      console.log(`📱 Message SID: ${smsResult.messageSid}`)
      console.log(`💰 Cost: $${smsResult.cost} CAD`)
      console.log(`⏱️ Delivery: ${smsResult.deliveryTime}ms`)
      return true
    } else {
      console.error('❌ SMS failed:', smsResult.error)
      return false
    }
    
  } catch (error) {
    console.error('❌ SMS notification error:', error)
    return false
  }
}

// Smart notification logic - FCM first, SMS backup
export async function sendSmartNotification(notificationData: NotificationData): Promise<{
  fcm: FCMResponse,
  sms: boolean,
  totalTime: number
}> {
  const startTime = Date.now()
  
  console.log('🧠 Sending smart notification with backup...')
  
  // Try FCM first (fastest)
  const fcmResult = await sendAdminNotification(notificationData)
  
  // Smart SMS decision using real logic
  const { shouldSendSMS } = await import('@/lib/sms')
  const needsSMSBackup = shouldSendSMS(
    fcmResult.success,
    notificationData.coupon_value,
    isAfterBusinessHours()
  )
  
  let smsResult = false
  
  if (needsSMSBackup) {
    console.log('📱 Sending SMS backup...')
    smsResult = await sendSMSNotification(notificationData)
  } else {
    console.log('✅ FCM successful, SMS backup not needed')
  }
  
  const totalTime = Date.now() - startTime
  
  console.log(`📊 Smart notification completed in ${totalTime}ms`)
  console.log(`   FCM: ${fcmResult.success ? '✅' : '❌'}`)
  console.log(`   SMS: ${needsSMSBackup ? (smsResult ? '✅' : '❌') : '⏭️ Skipped'}`)
  
  return {
    fcm: fcmResult,
    sms: smsResult,
    totalTime: totalTime
  }
}

// Helper function to check if it's after business hours
function isAfterBusinessHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  
  // Assume business hours: 8 AM - 8 PM
  return hour < 8 || hour >= 20
}

// Test notification function (for debugging)
export async function sendTestNotification(): Promise<FCMResponse> {
  const testData: NotificationData = {
    customer_name: 'Test Customer',
    customer_phone: '+1-416-555-0123',
    coupon_type: 'discount_10',
    coupon_value: 10,
    used_at: new Date().toISOString()
  }
  
  return await sendAdminNotification(testData)
}