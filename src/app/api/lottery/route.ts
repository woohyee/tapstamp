import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'

// 가장 단순하고 명확한 확률 구현

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

    // Perform simple lottery draw
    const result = performLottery()
    
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

function performLottery() {
  const random = Math.random() * 100;
  
  console.log(`🎰 Lottery draw: random=${random.toFixed(2)}`)
  
  let discountPercent;
  if (random < 55) {
    discountPercent = 5;
    console.log('Result: 5% 할인 쿠폰');
  } else if (random < 80) {  // 55 + 25 = 80
    discountPercent = 10;
    console.log('Result: 10% 할인 쿠폰');
  } else if (random < 95) {  // 80 + 15 = 95
    discountPercent = 15;
    console.log('Result: 15% 할인 쿠폰');
  } else {                   // 95~100 (5% 확률)
    discountPercent = 20;
    console.log('Result: 20% 할인 쿠폰');
  }
  
  return {
    type: `discount_${discountPercent}`,
    name: `${discountPercent}% OFF`,
    weight: discountPercent === 5 ? 55 : discountPercent === 10 ? 25 : discountPercent === 15 ? 15 : 5,
    value: discountPercent
  }
}