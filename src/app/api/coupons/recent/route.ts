import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const since = url.searchParams.get('since') // timestamp
    
    // 최근 사용된 쿠폰들 조회 (최근 1분 이내)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    const sinceTime = since ? new Date(parseInt(since)) : oneMinuteAgo
    
    const couponsQuery = query(
      collection(db, 'coupons'),
      where('used', '==', true),
      where('used_at', '>=', sinceTime),
      orderBy('used_at', 'desc'),
      limit(10)
    )
    
    const couponsSnapshot = await getDocs(couponsQuery)
    
    const recentCoupons = []
    
    for (const couponDoc of couponsSnapshot.docs) {
      const couponData = couponDoc.data()
      
      // 고객 정보 가져오기
      const customerDoc = await getDoc(doc(db, 'customers', couponData.customer_id))
      const customerData = customerDoc.exists() ? customerDoc.data() : null
      
      recentCoupons.push({
        id: couponDoc.id,
        type: couponData.type,
        value: couponData.value,
        used_at: couponData.used_at,
        customer_name: customerData?.name || 'Unknown',
        customer_phone: customerData?.phone || 'Unknown'
      })
    }
    
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