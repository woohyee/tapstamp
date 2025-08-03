import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, limit, getDocs, getDoc, doc, orderBy } from 'firebase/firestore'

export async function GET() {
  try {
    console.log('🔍 Pending coupons API called - checking unused coupons')
    
    // 미사용 쿠폰 조회 (used == false)
    const couponsQuery = query(
      collection(db, 'coupons'),
      where('used', '==', false),
      limit(50)
    )
    
    console.log('🔍 Executing pending coupons query...')
    const couponsSnapshot = await getDocs(couponsQuery)
    console.log('📊 Found pending coupons:', couponsSnapshot.docs.length)
    
    const pendingCoupons = []
    
    for (const couponDoc of couponsSnapshot.docs) {
      try {
        const couponData = couponDoc.data()
        console.log('📄 Processing pending coupon:', couponDoc.id, couponData)
        
        // 고객 정보 가져오기
        const customerDoc = await getDoc(doc(db, 'customers', couponData.customer_id))
        const customerData = customerDoc.exists() ? customerDoc.data() : null
        console.log('👤 Customer data:', customerData?.name)
        
        // created_at을 ISO string으로 변환
        const createdAtDate = couponData.created_at?.toDate ? couponData.created_at.toDate() : new Date(couponData.created_at)
        const expiresAtDate = couponData.expires_at?.toDate ? couponData.expires_at.toDate() : new Date(couponData.expires_at)
        
        pendingCoupons.push({
          id: couponDoc.id,
          type: couponData.type,
          value: couponData.value,
          created_at: createdAtDate.toISOString(),
          expires_at: expiresAtDate.toISOString(),
          customer_name: customerData?.name || 'Unknown',
          customer_phone: customerData?.phone || 'Unknown',
          source: couponData.source || 'lottery'
        })
      } catch (couponError) {
        console.error('🚨 Error processing pending coupon:', couponDoc.id, couponError)
        // 개별 쿠폰 오류는 무시하고 계속 진행
      }
    }
    
    // 최신순 정렬 (created_at 기준)
    pendingCoupons.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    console.log('✅ Processed pending coupons:', pendingCoupons.length)
    console.log('🔥 Latest pending coupon customer:', pendingCoupons[0]?.customer_name || 'None')
    
    return NextResponse.json({ 
      success: true,
      coupons: pendingCoupons
    })
  } catch (error) {
    console.error('Pending coupons API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}