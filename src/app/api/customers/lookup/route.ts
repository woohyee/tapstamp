import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    console.log('👥 Customer lookup API called')
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    if (!body.phone) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 }
      )
    }

    // 전화번호로 고객 검색
    const customersQuery = query(
      collection(db, 'customers'),
      where('phone', '==', body.phone),
      limit(1)
    )
    
    console.log('🔍 Searching for customer with phone:', body.phone)
    const customerSnapshot = await getDocs(customersQuery)
    
    if (customerSnapshot.empty) {
      console.log('❌ Customer not found')
      return NextResponse.json({
        success: false,
        message: 'Customer not found with this phone number.'
      })
    }

    const customerDoc = customerSnapshot.docs[0]
    const customer = { id: customerDoc.id, ...customerDoc.data() } as {
      id: string;
      name: string;
      phone: string;
      email?: string;
      stamps: number;
      vip_status: boolean;
    }
    console.log('✅ Customer found:', customer.name)

    // 해당 고객의 쿠폰 사용 내역 조회
    const couponsQuery = query(
      collection(db, 'coupons'),
      where('customer_id', '==', customer.id),
      limit(20)
    )
    
    console.log('🎫 Searching for coupons...')
    const couponsSnapshot = await getDocs(couponsQuery)
    console.log('📊 Found coupons:', couponsSnapshot.docs.length)
    
    const coupons = []
    for (const couponDoc of couponsSnapshot.docs) {
      const couponData = couponDoc.data()
      
      // used_at 시간 처리
      let usedAtFormatted = null
      if (couponData.used_at) {
        const usedAtDate = couponData.used_at?.toDate ? couponData.used_at.toDate() : new Date(couponData.used_at)
        usedAtFormatted = usedAtDate.toISOString()
      }
      
      coupons.push({
        id: couponDoc.id,
        type: couponData.type,
        value: couponData.value,
        used: couponData.used,
        used_at: usedAtFormatted,
        created_at: couponData.created_at?.toDate ? couponData.created_at.toDate().toISOString() : couponData.created_at,
        expires_at: couponData.expires_at?.toDate ? couponData.expires_at.toDate().toISOString() : couponData.expires_at
      })
    }

    // 사용된 쿠폰과 미사용 쿠폰 분리
    const usedCoupons = coupons.filter(c => c.used === true)
    const unusedCoupons = coupons.filter(c => c.used === false)
    
    console.log('📈 Result summary:', {
      usedCount: usedCoupons.length,
      unusedCount: unusedCoupons.length
    })

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        stamps: customer.stamps || 0,
        vip_status: customer.vip_status || false
      },
      coupons: {
        used: usedCoupons,
        unused: unusedCoupons,
        total: coupons.length
      }
    })
  } catch (error) {
    console.error('Customer lookup API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}