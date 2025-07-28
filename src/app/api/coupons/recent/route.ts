import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, limit, getDocs, getDoc, doc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Recent coupons API called')
    const url = new URL(request.url)
    const since = url.searchParams.get('since') // timestamp
    
    console.log('📅 Since parameter:', since)
    
    // 단순하게 사용된 모든 쿠폰 조회 (orderBy 제거)
    const couponsQuery = query(
      collection(db, 'coupons'),
      where('used', '==', true),
      limit(20)
    )
    
    console.log('🔍 Executing query...')
    const couponsSnapshot = await getDocs(couponsQuery)
    console.log('📊 Found coupons:', couponsSnapshot.docs.length)
    
    const recentCoupons = []
    
    for (const couponDoc of couponsSnapshot.docs) {
      try {
        const couponData = couponDoc.data()
        console.log('📄 Processing coupon:', couponDoc.id, couponData)
        
        // 고객 정보 가져오기
        const customerDoc = await getDoc(doc(db, 'customers', couponData.customer_id))
        const customerData = customerDoc.exists() ? customerDoc.data() : null
        console.log('👤 Customer data:', customerData?.name)
        
        recentCoupons.push({
          id: couponDoc.id,
          type: couponData.type,
          value: couponData.value,
          used_at: couponData.used_at,
          customer_name: customerData?.name || 'Unknown',
          customer_phone: customerData?.phone || 'Unknown'
        })
      } catch (couponError) {
        console.error('🚨 Error processing coupon:', couponDoc.id, couponError)
        // 개별 쿠폰 오류는 무시하고 계속 진행
      }
    }
    
    console.log('✅ Processed coupons:', recentCoupons.length)
    
    return NextResponse.json({ 
      success: true,
      coupons: recentCoupons
    })
  } catch (error) {
    console.error('Recent coupons API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}