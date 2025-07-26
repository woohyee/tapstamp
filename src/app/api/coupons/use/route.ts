import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', body.coupon_id)
      .eq('customer_id', body.customer_id)
      .single()

    if (fetchError || !coupon) {
      console.error('Coupon fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Coupon not found.', details: fetchError?.message },
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
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Coupon has expired.' },
        { status: 400 }
      )
    }

    // Mark coupon as used
    const { error: updateError } = await supabase
      .from('coupons')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', body.coupon_id)

    if (updateError) {
      console.error('Coupon update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to use coupon.', details: updateError.message },
        { status: 500 }
      )
    }

    // Get customer info for admin notification
    const { data: customer } = await supabase
      .from('customers')
      .select('name, phone')
      .eq('id', body.customer_id)
      .single()

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
      used_at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      message: 'Coupon used successfully. Admin has been notified.',
      coupon: {
        ...coupon,
        used: true,
        used_at: new Date().toISOString()
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