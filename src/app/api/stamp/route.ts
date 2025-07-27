import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore'
import { CartridgeRegistry } from '@/cartridges/base/CartridgeRegistry'

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

    // 카트리지 시스템으로 이벤트 체크
    const eventTriggered = await checkCartridgeEvents(updatedCustomer)

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

async function checkCartridgeEvents(customer: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  stamps: number;
  vip_status: boolean;
  vip_expires_at?: Timestamp;
}) {
  const stamps = customer.stamps
  
  console.log('🎮 Checking cartridge events for customer:', customer.id, 'stamps:', stamps)
  
  try {
    // 카트리지 레지스트리에서 모든 카트리지 확인
    const registry = new CartridgeRegistry()
    
    // 5StampLottery 카트리지 등록
    const { FiveStampLotteryCartridge } = await import('@/cartridges/5StampLottery')
    registry.register('5StampLottery', new FiveStampLotteryCartridge())
    
    const result = await registry.executeCartridge(stamps, customer.id)
    
    if (result && result.success && result.redirect) {
      console.log('✅ Cartridge event triggered:', result)
      return {
        type: 'cartridge',
        redirect: result.redirect,
        message: result.message,
        data: result.data
      }
    }
    
    // 기존 쿠폰 발급 로직 유지
    await checkAndIssueCoupons(customer)
    
    return null
  } catch (error) {
    console.error('🚨 Cartridge system error:', error)
    // 카트리지 오류 시 기존 쿠폰 시스템으로 fallback
    return await checkAndIssueCoupons(customer)
  }
}

async function checkAndIssueCoupons(customer: {
  id: string;
  stamps: number;
}) {
  const stamps = customer.stamps
  
  console.log('💰 Checking regular coupons for customer:', customer.id, 'stamps:', stamps)
  
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
  
  return null
}