import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Lottery items definition (weight-based)
const LOTTERY_ITEMS = [
  { type: 'empty', name: 'OOPS!', weight: 30, value: null },
  { type: 'discount_5', name: '5% OFF', weight: 35, value: 5 },
  { type: 'discount_10', name: '10% OFF', weight: 20, value: 10 },
  { type: 'discount_15', name: '15% OFF', weight: 10, value: 15 },
  { type: 'discount_20', name: '20% OFF', weight: 5, value: 20 }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.customer_id) {
      return NextResponse.json(
        { error: 'Customer ID is required.' },
        { status: 400 }
      )
    }

    // Check if customer is eligible for lottery event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('customer_id', body.customer_id)
      .eq('event_type', 'lottery')
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Not eligible for lottery event.' },
        { status: 403 }
      )
    }

    // Check if already drawn
    if (event.event_data?.completed) {
      return NextResponse.json(
        { error: 'Lottery already completed.' },
        { status: 400 }
      )
    }

    // Perform weighted lottery draw
    const result = performWeightedLottery()
    
    // Update event to completed status
    await supabase
      .from('events')
      .update({
        event_data: {
          ...event.event_data,
          completed: true,
          result: result
        }
      })
      .eq('id', event.id)

    // Issue coupon if won
    if (result.type !== 'empty') {
      await supabase
        .from('coupons')
        .insert([{
          customer_id: body.customer_id,
          type: result.type,
          value: result.value,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          source: 'lottery'
        }])
    }

    return NextResponse.json({ 
      success: true,
      result: result
    })
  } catch (error) {
    console.error('Lottery API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}

function performWeightedLottery() {
  // Calculate total weight
  const totalWeight = LOTTERY_ITEMS.reduce((sum, item) => sum + item.weight, 0)
  
  // Random value between 0 and totalWeight-1
  const random = Math.floor(Math.random() * totalWeight)
  
  // Select item based on weight
  let currentWeight = 0
  for (const item of LOTTERY_ITEMS) {
    currentWeight += item.weight
    if (random < currentWeight) {
      return item
    }
  }
  
  // Fallback (should never reach here)
  return LOTTERY_ITEMS[0]
}