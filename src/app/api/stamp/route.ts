import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore'

// Force Node.js runtime for Firebase compatibility
export const runtime = 'nodejs'

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
        code: stampError instanceof Error ? (stampError as { code?: string }).code : 'N/A',
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
      // 🎯 강화된 스탬프 적립 성공 알림
      console.log('⭐⭐⭐ [STAMP ADDED] SUCCESS! ⭐⭐⭐')
      console.log('📈 [PROGRESS] Customer:', customer.name, 'Stamps:', customer.stamps, '→', newStampCount)
      console.log('👤 [CUSTOMER] Phone:', customer.phone, 'ID:', customer.id)
      console.log('💾 [FIREBASE] Customer stamps updated in database')
      console.log('🎯 [NEXT CHECK] Checking for 5-stamp lottery event...')
      if (shouldBecomeVip) {
        console.log('👑 [VIP UPGRADE] Customer became VIP! (30+ stamps)')
      }
      console.log('⭐⭐⭐ [STAMP ADDED] END ⭐⭐⭐')
      
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

    // 5개 스탬프 직접 체크 및 이벤트 처리
    const eventTriggered = await checkStampEvents(updatedCustomer)

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

async function checkStampEvents(customer: {
  id: string;
  stamps: number;
  name: string;
  phone: string;
  email?: string;
  vip_status: boolean;
  vip_expires_at?: Timestamp;
}) {
  const stamps = customer.stamps
  
  console.log('🎯 Direct stamp event check for customer:', customer.id, 'stamps:', stamps)
  
  // 5개 스탬프 체크
  if (stamps === 5) {
    console.log('🚨 5 STAMPS DETECTED! Checking lottery eligibility...')
    
    try {
      // 실전 모드: 중복 참여 체크
      const { query, where, getDocs, collection, addDoc } = await import('firebase/firestore')
      const eventsQuery = query(
        collection(db, 'events'), 
        where('customer_id', '==', customer.id),
        where('event_type', '==', 'lottery')
      )
      const eventsSnapshot = await getDocs(eventsQuery)
      
      if (eventsSnapshot.empty) {
        console.log('✅ No previous lottery participation, triggering event...')
        
        // 이벤트 참여 기록 추가
        await addDoc(collection(db, 'events'), {
          customer_id: customer.id,
          event_type: 'lottery',
          event_data: { eligible: true },
          created_at: new Date()
        })
        
        console.log('🎉 Lottery event triggered! Redirecting to /coupon')
        return {
          type: 'lottery',
          redirect: '/coupon',
          message: '5개 스탬프 달성! 랜덤 쿠폰 이벤트!',
          stamps: 5
        }
      } else {
        console.log('❌ Customer already participated in lottery')
      }
    } catch (error) {
      console.error('🚨 Error checking lottery eligibility:', error)
    }
  }
  
  return null
}


