import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Coupon issue API called')
    const body = await request.json()
    console.log('Request body:', body)
    
    if (!body.customer_id || !body.type) {
      console.log('Missing required fields:', { customer_id: body.customer_id, type: body.type })
      return NextResponse.json(
        { error: 'Customer ID and coupon type are required.' },
        { status: 400 }
      )
    }

    // Get coupon value based on type
    const couponValues = {
      'discount_5': 5,
      'discount_10': 10, 
      'discount_15': 15,
      'discount_20': 20
    }

    const value = couponValues[body.type as keyof typeof couponValues]
    console.log('Coupon value:', value, 'for type:', body.type)
    if (!value) {
      console.log('Invalid coupon type:', body.type)
      return NextResponse.json(
        { error: 'Invalid coupon type.' },
        { status: 400 }
      )
    }

    console.log('Attempting to insert coupon...')
    // Issue coupon (removing source field if it doesn't exist)
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert([{
        customer_id: body.customer_id,
        type: body.type,
        value: value,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        used: false
      }])
      .select()
      .single()

    if (couponError) {
      console.error('Coupon issue error:', couponError)
      return NextResponse.json(
        { error: 'Failed to issue coupon.', details: couponError.message },
        { status: 500 }
      )
    }

    console.log('Coupon issued successfully:', coupon)
    return NextResponse.json({ 
      success: true,
      coupon: coupon
    })
  } catch (error) {
    console.error('Coupon issue API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}