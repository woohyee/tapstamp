import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'

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

    // Get customer info for admin notification
    const customerDoc = await getDoc(doc(db, 'customers', body.customer_id))
    const customer = customerDoc.exists() ? customerDoc.data() : null

    // TODO: Send notification to admin
    // This could be implemented with:
    // - WebSocket notification
    // - Email notification  
    // - Push notification
    // - Database notification table
    console.log('ADMIN NOTIFICATION:', {
      message: 'Coupon used',
      customer: customer?.name,
      phone: customer?.phone,
      coupon_type: coupon.type,
      coupon_value: coupon.value,
      used_at: new Date()
    })

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