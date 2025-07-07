import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.customer_id) {
      return NextResponse.json(
        { error: '고객 ID는 필수입니다.' },
        { status: 400 }
      )
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', body.customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: '고객 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 스탬프 기록 추가 (금액은 0으로 고정)
    const { error: stampError } = await supabase
      .from('stamps')
      .insert([{
        customer_id: body.customer_id,
        amount: 0
      }])

    if (stampError) {
      console.error('Stamp insert error:', stampError)
      return NextResponse.json(
        { error: '스탬프 적립에 실패했습니다.' },
        { status: 500 }
      )
    }

    const newStampCount = customer.stamps + 1
    const shouldBecomeVip = newStampCount >= 30 && !customer.vip_status

    // 고객 정보 업데이트
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        stamps: newStampCount,
        vip_status: shouldBecomeVip ? true : customer.vip_status,
        vip_expires_at: shouldBecomeVip ? 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : 
          customer.vip_expires_at
      })
      .eq('id', body.customer_id)
      .select()
      .single()

    if (updateError) {
      console.error('Customer update error:', updateError)
      return NextResponse.json(
        { error: '고객 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 쿠폰 발급 체크
    await checkAndIssueCoupons(updatedCustomer)

    return NextResponse.json({ customer: updatedCustomer })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

async function checkAndIssueCoupons(customer: { id: string; stamps: number }) {
  const stamps = customer.stamps
  
  if (stamps === 10) {
    await supabase
      .from('coupons')
      .insert([{
        customer_id: customer.id,
        type: 'discount_10',
        value: 10,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }])
  }
  
  if (stamps === 15) {
    await supabase
      .from('coupons')
      .insert([{
        customer_id: customer.id,
        type: 'discount_20',
        value: 20,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }])
  }
  
  if (stamps > 15 && stamps % 10 === 0) {
    await supabase
      .from('coupons')
      .insert([{
        customer_id: customer.id,
        type: 'discount_10',
        value: 10,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }])
  }
}