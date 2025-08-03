// Test API for Real-Time Notification System
// Use this to test FCM + SMS integration

import { NextRequest, NextResponse } from 'next/server'
import { sendSmartNotification, sendTestNotification } from '@/lib/fcm-admin'
import { sendTestSMS } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [TEST] Notification system test started...')
    
    const body = await request.json()
    const { test_type } = body
    
    const results: {
      timestamp: string;
      test_type: string;
      results: Record<string, unknown>;
    } = {
      timestamp: new Date().toISOString(),
      test_type: test_type || 'full_system',
      results: {}
    }
    
    switch (test_type) {
      case 'fcm_only':
        console.log('🧪 [TEST] Testing FCM only...')
        const fcmResult = await sendTestNotification()
        results.results.fcm = fcmResult
        break
        
      case 'sms_only':
        console.log('🧪 [TEST] Testing SMS only...')
        const smsResult = await sendTestSMS()
        results.results.sms = smsResult
        break
        
      case 'full_system':
      default:
        console.log('🧪 [TEST] Testing full smart notification system...')
        
        const testData = {
          customer_name: 'Test Customer',
          customer_phone: '+1-416-555-TEST',
          coupon_type: 'discount_15',
          coupon_value: 15,  // High value to trigger SMS
          used_at: new Date().toISOString()
        }
        
        const smartResult = await sendSmartNotification(testData)
        results.results = smartResult
        break
    }
    
    console.log('🧪 [TEST] Test completed:', results)
    
    return NextResponse.json({
      success: true,
      message: 'Notification test completed',
      ...results
    })
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error)
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'TapStamp Notification Test API',
    available_tests: [
      {
        type: 'fcm_only',
        description: 'Test FCM push notification only',
        method: 'POST',
        body: { test_type: 'fcm_only' }
      },
      {
        type: 'sms_only', 
        description: 'Test SMS notification only',
        method: 'POST',
        body: { test_type: 'sms_only' }
      },
      {
        type: 'full_system',
        description: 'Test complete smart notification system',
        method: 'POST',
        body: { test_type: 'full_system' }
      }
    ],
    usage: 'POST /api/test/notifications with test_type in body'
  })
}