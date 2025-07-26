import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required.' },
        { status: 400 }
      )
    }

    // Get all unused coupons for the customer
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('customer_id', customerId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString()) // Not expired
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching coupons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch coupons.', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      coupons: coupons || [],
      hasUnusedCoupons: coupons && coupons.length > 0
    })
  } catch (error) {
    console.error('Coupon check API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}