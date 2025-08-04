import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'

// Lottery items definition (CLAUDE.md 업데이트된 확률 - 꽝 완전 제거)
const LOTTERY_ITEMS = [
  { type: 'discount_5', name: '5% OFF', weight: 55, value: 5 },
  { type: 'discount_10', name: '10% OFF', weight: 25, value: 10 },
  { type: 'discount_15', name: '15% OFF', weight: 15, value: 15 },
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
    const eventsQuery = query(
      collection(db, 'events'), 
      where('customer_id', '==', body.customer_id),
      where('event_type', '==', 'lottery')
    )
    const eventsSnapshot = await getDocs(eventsQuery)

    if (eventsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Not eligible for lottery event.' },
        { status: 403 }
      )
    }

    const event = { 
      id: eventsSnapshot.docs[0].id, 
      ...eventsSnapshot.docs[0].data() 
    } as {
      id: string;
      customer_id: string;
      event_type: string;
      event_data: { completed?: boolean; eligible?: boolean; result?: { type: string; name: string; weight: number; value: number | null } };
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
    await updateDoc(doc(db, 'events', event.id), {
      event_data: {
        ...event.event_data,
        completed: true,
        result: result
      }
    })

    // 모든 결과가 쿠폰이므로 항상 발급 (꽝 제거됨)
    await addDoc(collection(db, 'coupons'), {
      customer_id: body.customer_id,
      type: result.type,
      value: result.value,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      used: false,
      created_at: new Date()
    })

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