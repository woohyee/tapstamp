import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CustomerRegistration } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: CustomerRegistration = await request.json()
    
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: '이름과 전화번호는 필수입니다.' },
        { status: 400 }
      )
    }

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', body.phone)
      .single()

    if (existingCustomer) {
      return NextResponse.json(
        { error: '이미 등록된 전화번호입니다.' },
        { status: 409 }
      )
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert([
        {
          name: body.name,
          phone: body.phone,
          email: body.email,
          stamps: 0
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: '고객 등록에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}