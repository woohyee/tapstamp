import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, limit, getDocs, getDoc, doc, orderBy } from 'firebase/firestore'

export async function GET() {
  try {
    console.log('🔍 Recent coupons API called - simple query mode')
    
    console.log('🔍 Simple query for all used coupons')
    
    // 간단한 쿠폰 조회 (orderBy 제거)
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
        
        // used_at 시간 간단 처리
        console.log('📄 Processing coupon:', couponDoc.id)
        
        // 고객 정보 가져오기
        const customerDoc = await getDoc(doc(db, 'customers', couponData.customer_id))
        const customerData = customerDoc.exists() ? customerDoc.data() : null
        console.log('👤 Customer data:', customerData?.name)
        
        // used_at을 ISO string으로 변환
        const usedAtDate = couponData.used_at?.toDate ? couponData.used_at.toDate() : new Date(couponData.used_at)
        
        recentCoupons.push({
          id: couponDoc.id,
          type: couponData.type,
          value: couponData.value,
          used_at: usedAtDate.toISOString(), // 🔥 ISO string으로 변환
          customer_name: customerData?.name || 'Unknown',
          customer_phone: customerData?.phone || 'Unknown'
        })
      } catch (couponError) {
        console.error('🚨 Error processing coupon:', couponDoc.id, couponError)
        // 개별 쿠폰 오류는 무시하고 계속 진행
      }
    }
    
    // 🚨 bang 고객 누락 방지 - 클라이언트 사이드에서도 최신순 정렬
    recentCoupons.sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
    
    console.log('✅ Processed coupons:', recentCoupons.length)
    console.log('🔥 Latest coupon customer:', recentCoupons[0]?.customer_name || 'None')
    
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