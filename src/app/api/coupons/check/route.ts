import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

// Force Node.js runtime for Firebase compatibility
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required.' },
        { status: 400 }
      )
    }

    // 🚨 강화된 미사용 쿠폰 확인 - 단순화로 에러 방지
    console.log('🔍 [COUPON CHECK] Checking unused coupons for customer:', customerId)
    
    try {
      const couponsQuery = query(
        collection(db, 'coupons'),
        where('customer_id', '==', customerId),
        where('used', '==', false)
        // orderBy 제거로 Firebase 인덱스 문제 해결
      )
      
      console.log('📋 [COUPON CHECK] Executing Firebase query...')
      const couponsSnapshot = await getDocs(couponsQuery)
      console.log('📊 [COUPON CHECK] Found coupons:', couponsSnapshot.docs.length)
      
      const allCoupons = []
      for (const doc of couponsSnapshot.docs) {
        const data = doc.data()
        
        // 만료일 확인 (클라이언트 사이드에서)
        const expiresAt = data.expires_at?.toDate ? data.expires_at.toDate() : new Date(data.expires_at)
        const isExpired = expiresAt < new Date()
        
        console.log('🎫 [COUPON CHECK] Coupon:', doc.id, 'Expired:', isExpired, 'Value:', data.value)
        
        if (!isExpired) {
          allCoupons.push({
            id: doc.id,
            customer_id: data.customer_id,
            type: data.type,
            value: data.value,
            used: data.used,
            expires_at: expiresAt.toISOString(),
            created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : new Date().toISOString()
          })
        }
      }
      
      const hasUnusedCoupons = allCoupons.length > 0
      console.log('✅ [COUPON CHECK] Result:', hasUnusedCoupons ? `${allCoupons.length} unused coupons found` : 'No unused coupons')

      return NextResponse.json({ 
        success: true,
        coupons: allCoupons,
        hasUnusedCoupons: hasUnusedCoupons
      })
    } catch (error) {
      console.error('Error fetching coupons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch coupons.', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Coupon check API error:', error)
    return NextResponse.json(
      { error: 'Server error occurred.' },
      { status: 500 }
    )
  }
}