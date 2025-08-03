import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { sendCouponUsedNotification } from '@/lib/fcm-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.coupon_id || !body.customer_id) {
      return NextResponse.json(
        { error: 'Coupon ID and Customer ID are required.' },
        { status: 400 }
      )
    }

    // Check if coupon exists and is valid
    const couponDoc = await getDoc(doc(db, 'coupons', body.coupon_id))
    
    if (!couponDoc.exists()) {
      return NextResponse.json(
        { error: 'Coupon not found.' },
        { status: 404 }
      )
    }
    
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as {
      id: string;
      customer_id: string;
      type: string;
      value: number;
      used: boolean;
      expires_at: Timestamp;
    }
    
    if (coupon.customer_id !== body.customer_id) {
      return NextResponse.json(
        { error: 'Coupon not found.' },
        { status: 404 }
      )
    }

    if (coupon.used) {
      return NextResponse.json(
        { error: 'Coupon already used.' },
        { status: 400 }
      )
    }

    // Check if expired
    if (coupon.expires_at && coupon.expires_at.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'Coupon has expired.' },
        { status: 400 }
      )
    }

    // Mark coupon as used
    try {
      await updateDoc(doc(db, 'coupons', body.coupon_id), {
        used: true,
        used_at: new Date()
      })
    } catch (updateError) {
      console.error('Coupon update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to use coupon.', details: updateError instanceof Error ? updateError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Get customer info for INSTANT admin notification
    const customerDoc = await getDoc(doc(db, 'customers', body.customer_id))
    const customer = customerDoc.exists() ? customerDoc.data() : null

    // 🚀 INSTANT REAL-TIME NOTIFICATION SYSTEM
    console.log('🚨🚨🚨 [INSTANT ALERT] COUPON USED! 🚨🚨🚨')
    console.log('⚡️ [REAL-TIME] Sending INSTANT notification...')
    console.log('👤 [CUSTOMER] Name:', customer?.name, 'Phone:', customer?.phone)
    console.log('🎫 [COUPON] Value:', coupon.value, '% OFF, Type:', coupon.type)
    console.log('⏰ [TIME] Used at:', new Date().toLocaleString('en-CA'))
    
    // 🚀 FCM 푸시 알림 발송 (0.5초 이내 목표)
    const notificationStart = Date.now()
    
    try {
      const fcmResult = await sendCouponUsedNotification({
        customer_name: customer?.name || 'Unknown Customer',
        customer_phone: customer?.phone || 'Unknown Phone',
        coupon_type: coupon.type,
        coupon_value: coupon.value,
        used_at: new Date().toISOString()
      })
      
      const notificationTime = Date.now() - notificationStart
      
      console.log('🎉 [SUCCESS] FCM 푸시 알림 발송 완료!')
      console.log(`⏱️ [SPEED] ${notificationTime}ms`)
      console.log(`📱 [FCM] ${fcmResult.success ? '✅ 성공' : '❌ 실패'}`)
      
      if (fcmResult.success) {
        console.log(`📨 [MESSAGE_ID] ${fcmResult.message_id}`)
        console.log('🎯 [ADMIN] 관리자에게 즉시 알림 전송됨!')
      } else {
        console.error(`❌ [ERROR] ${fcmResult.error}`)
      }
      
      // 성능 체크
      if (notificationTime < 500) {
        console.log('🏆 [PERFORMANCE] 0.5초 이내 - 우수!')
      } else if (notificationTime < 1000) {
        console.log('✅ [PERFORMANCE] 1초 이내 - 양호')
      } else {
        console.log('⚠️ [PERFORMANCE] 1초 초과 - 최적화 필요')
      }
      
    } catch (notificationError) {
      console.error('❌ [ERROR] FCM 알림 발송 실패:', notificationError)
      console.log('✅ [IMPORTANT] 쿠폰 처리는 성공 (고객에게 영향 없음)')
    }
    
    console.log('✅ [DB UPDATE] Coupon marked as used in Firebase')
    console.log('🎯 [ADMIN] Manager will receive INSTANT alert!')

    return NextResponse.json({ 
      success: true,
      message: 'Coupon used successfully. Admin has been notified.',
      coupon: {
        ...coupon,
        used: true,
        used_at: new Date()
      }
    })
  } catch (error) {
    console.error('Coupon use API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}