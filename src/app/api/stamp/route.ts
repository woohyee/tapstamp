import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Stamp API called')
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    if (!body.customer_id) {
      console.log('❌ Missing customer_id')
      return NextResponse.json(
        { error: '고객 ID는 필수입니다.' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching customer document:', body.customer_id)
    const customerDoc = await getDoc(doc(db, 'customers', body.customer_id))
    
    if (!customerDoc.exists()) {
      return NextResponse.json(
        { error: '고객 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const customer = { id: customerDoc.id, ...customerDoc.data() } as {
      id: string;
      name: string;
      phone: string;
      email?: string;
      stamps: number;
      vip_status: boolean;
      vip_expires_at?: Timestamp;
    }

    // 스탬프 기록 추가 (금액은 0으로 고정)
    try {
      console.log('💾 Adding stamp record to Firebase...')
      const stampRef = await addDoc(collection(db, 'stamps'), {
        customer_id: body.customer_id,
        amount: 0,
        created_at: new Date()
      })
      console.log('✅ Stamp record added with ID:', stampRef.id)
    } catch (stampError) {
      console.error('🚨 Stamp insert error:', stampError)
      console.error('🚨 Stamp error details:', {
        message: stampError instanceof Error ? stampError.message : 'Unknown error',
        code: stampError instanceof Error ? (stampError as any).code : 'N/A',
        stack: stampError instanceof Error ? stampError.stack : 'No stack trace'
      })
      return NextResponse.json(
        { error: '스탬프 적립에 실패했습니다.' },
        { status: 500 }
      )
    }

    const newStampCount = customer.stamps + 1
    const shouldBecomeVip = newStampCount >= 30 && !customer.vip_status

    // 고객 정보 업데이트
    let updatedCustomer
    try {
      console.log('🔄 Updating customer stamps:', newStampCount)
      await updateDoc(doc(db, 'customers', body.customer_id), {
        stamps: newStampCount,
        vip_status: shouldBecomeVip ? true : customer.vip_status,
        vip_expires_at: shouldBecomeVip ? 
          Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : 
          customer.vip_expires_at
      })
      console.log('✅ Customer updated successfully')
      
      updatedCustomer = {
        ...customer,
        stamps: newStampCount,
        vip_status: shouldBecomeVip ? true : customer.vip_status,
        vip_expires_at: shouldBecomeVip ? 
          Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : 
          customer.vip_expires_at
      }
    } catch (updateError) {
      console.error('Customer update error:', updateError)
      return NextResponse.json(
        { error: '고객 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 쿠폰 발급 체크
    const eventTriggered = await checkAndIssueCoupons(updatedCustomer)

    return NextResponse.json({ 
      customer: updatedCustomer,
      eventTriggered
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

async function checkAndIssueCoupons(customer: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  stamps: number;
  vip_status: boolean;
  vip_expires_at?: Timestamp;
}) {
  const stamps = customer.stamps
  let eventTriggered = null
  
  console.log('Checking coupons for customer:', customer.id, 'stamps:', stamps)
  
  // 5개 스탬프 복권 이벤트 - EXACTLY 5 stamps only
  if (stamps === 5) {
    console.log('5 stamps reached! Checking lottery eligibility...')
    // 이미 복권 이벤트에 참여했는지 확인
    const eventsQuery = query(
      collection(db, 'events'), 
      where('customer_id', '==', customer.id),
      where('event_type', '==', 'lottery')
    )
    const eventsSnapshot = await getDocs(eventsQuery)
    
    if (eventsSnapshot.empty) {
      // 복권 이벤트 참여 기록 추가
      await addDoc(collection(db, 'events'), {
        customer_id: customer.id,
        event_type: 'lottery',
        event_data: { eligible: true },
        created_at: new Date()
      })
      
      eventTriggered = { type: 'lottery', stamps: 5 }
    }
  }
  
  if (stamps === 10) {
    await addDoc(collection(db, 'coupons'), {
      customer_id: customer.id,
      type: 'discount_10',
      value: 10,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      used: false,
      created_at: new Date()
    })
  }
  
  if (stamps === 15) {
    await addDoc(collection(db, 'coupons'), {
      customer_id: customer.id,
      type: 'discount_20',
      value: 20,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      used: false,
      created_at: new Date()
    })
  }
  
  if (stamps > 15 && stamps % 10 === 0) {
    await addDoc(collection(db, 'coupons'), {
      customer_id: customer.id,
      type: 'discount_10',
      value: 10,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      used: false,
      created_at: new Date()
    })
  }
  
  return eventTriggered
}