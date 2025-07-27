import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'

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

    // Get all unused coupons for the customer
    try {
      const couponsQuery = query(
        collection(db, 'coupons'),
        where('customer_id', '==', customerId),
        where('used', '==', false),
        where('expires_at', '>', new Date()),
        orderBy('expires_at', 'desc'),
        orderBy('created_at', 'desc')
      )
      
      const couponsSnapshot = await getDocs(couponsQuery)
      const coupons = couponsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{
        id: string;
        customer_id: string;
        type: string;
        value: number;
        used: boolean;
        expires_at: Timestamp;
        created_at: Timestamp;
      }>

      return NextResponse.json({ 
        success: true,
        coupons: coupons || [],
        hasUnusedCoupons: coupons && coupons.length > 0
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