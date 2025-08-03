import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, limit } from 'firebase/firestore'

export async function GET() {
  try {
    console.log('🔍 Debug API: Checking all coupons...')
    
    // 모든 쿠폰 조회 (최신순)
    const couponsQuery = query(
      collection(db, 'coupons'),
      limit(10)
    )
    
    const couponsSnapshot = await getDocs(couponsQuery)
    console.log('📊 Total coupons found:', couponsSnapshot.docs.length)
    
    const allCoupons = []
    
    for (const couponDoc of couponsSnapshot.docs) {
      const couponData = couponDoc.data()
      console.log('📄 Coupon:', couponDoc.id, couponData)
      
      // used_at 시간 처리
      let usedAtFormatted = null
      if (couponData.used_at) {
        const usedAtDate = couponData.used_at?.toDate ? couponData.used_at.toDate() : new Date(couponData.used_at)
        usedAtFormatted = usedAtDate.toISOString()
      }
      
      allCoupons.push({
        id: couponDoc.id,
        type: couponData.type,
        value: couponData.value,
        used: couponData.used,
        used_at: usedAtFormatted,
        created_at: couponData.created_at?.toDate ? couponData.created_at.toDate().toISOString() : couponData.created_at,
        customer_id: couponData.customer_id
      })
    }
    
    // 사용된 쿠폰만 따로 필터링
    const usedCoupons = allCoupons.filter(c => c.used === true)
    
    console.log('✅ Debug summary:', {
      total: allCoupons.length,
      used: usedCoupons.length,
      unused: allCoupons.length - usedCoupons.length
    })
    
    return NextResponse.json({
      success: true,
      summary: {
        total: allCoupons.length,
        used: usedCoupons.length,
        unused: allCoupons.length - usedCoupons.length
      },
      allCoupons,
      usedCoupons
    })
  } catch (error) {
    console.error('🚨 Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}