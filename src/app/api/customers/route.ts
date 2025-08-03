import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { CustomerRegistration } from '@/types'

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Customer registration API called')
    const body: CustomerRegistration = await request.json()
    console.log('📝 Request body:', body)
    
    if (!body.name || !body.phone) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: '이름과 전화번호는 필수입니다.' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking for existing customer with phone:', body.phone)
    
    const customersQuery = query(
      collection(db, 'customers'), 
      where('phone', '==', body.phone)
    )
    const existingSnapshot = await getDocs(customersQuery)
    console.log('📊 Existing customer check result:', existingSnapshot.empty ? 'No duplicates' : 'Duplicate found')

    if (!existingSnapshot.empty) {
      console.log('❌ Duplicate phone number found')
      return NextResponse.json(
        { error: '이미 등록된 전화번호입니다.' },
        { status: 409 }
      )
    }

    try {
      console.log('💾 Creating new customer in Firebase...')
      const docRef = await addDoc(collection(db, 'customers'), {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        stamps: 1,
        vip_status: false,
        vip_expires_at: null,
        created_at: new Date()
      })

      // 🔥 강화된 고객 등록 성공 알림
      console.log('🎉🎉🎉 [CUSTOMER REGISTERED] SUCCESS! 🎉🎉🎉')
      console.log('👤 [NEW CUSTOMER] Created successfully with ID:', docRef.id)
      console.log('📝 [DETAILS] Name:', body.name, 'Phone:', body.phone)
      console.log('💾 [FIREBASE] Customer data saved to Firebase Firestore')
      console.log('🏆 [FIRST STAMP] Customer ready for stamp collection')
      console.log('🔗 [CONNECTION] Firebase connection working properly')
      console.log('🎉🎉🎉 [CUSTOMER REGISTERED] END 🎉🎉🎉')

      // 첫 스탬프 기록도 함께 생성
      console.log('💎 Adding first stamp record...')
      await addDoc(collection(db, 'stamps'), {
        customer_id: docRef.id,
        amount: 0,
        created_at: new Date()
      })
      console.log('✅ First stamp record created')

      const customer = {
        id: docRef.id,
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        stamps: 1,
        vip_status: false,
        vip_expires_at: null,
        created_at: new Date()
      }

      console.log('📤 Returning customer data:', customer)
      return NextResponse.json({ customer })
    } catch (error) {
      console.error('🚨 Firebase connection error:', error)
      console.error('🚨 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error ? (error as { code?: string }).code : 'N/A',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      return NextResponse.json(
        { error: '고객 등록에 실패했습니다.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}