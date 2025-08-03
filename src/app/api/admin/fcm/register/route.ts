// API for registering admin FCM tokens
// Critical for INSTANT notifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 FCM token registration request received')
    console.log('🔍 Debugging: Request method:', request.method)
    console.log('🔍 Debugging: Request headers:', Object.fromEntries(request.headers.entries()))
    
    const body = await request.json()
    console.log('🔍 Debugging: Request body:', body)
    const { fcm_token, device_info } = body
    
    if (!fcm_token) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      )
    }
    
    console.log('🎯 Registering FCM token:', fcm_token.substring(0, 20) + '...')
    
    // Store FCM token in Firebase
    // Using a single admin document (can expand to multiple admins later)
    const adminFCMDoc = {
      fcm_token: fcm_token,
      device_info: device_info || {},
      registered_at: new Date(),
      last_updated: new Date(),
      is_active: true
    }
    
    await setDoc(doc(db, 'admin_fcm_tokens', 'main_admin'), adminFCMDoc)
    
    console.log('✅ FCM token registered successfully')
    
    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      token_preview: fcm_token.substring(0, 20) + '...'
    })
    
  } catch (error) {
    console.error('❌ FCM token registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register FCM token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check current FCM token status
export async function GET() {
  try {
    console.log('🔍 Checking FCM token status...')
    console.log('🔍 Debugging: Firebase db object:', !!db)
    console.log('🔍 Debugging: Attempting to read admin_fcm_tokens/main_admin')
    
    const adminFCMDoc = await getDoc(doc(db, 'admin_fcm_tokens', 'main_admin'))
    console.log('🔍 Debugging: Document exists:', adminFCMDoc.exists())
    
    if (!adminFCMDoc.exists()) {
      return NextResponse.json({
        success: false,
        message: 'No FCM token registered'
      })
    }
    
    const data = adminFCMDoc.data()
    
    return NextResponse.json({
      success: true,
      message: 'FCM token found',
      registered_at: data.registered_at,
      last_updated: data.last_updated,
      is_active: data.is_active,
      token_preview: data.fcm_token?.substring(0, 20) + '...'
    })
    
  } catch (error) {
    console.error('❌ Error checking FCM token status:', error)
    return NextResponse.json(
      { error: 'Failed to check FCM status' },
      { status: 500 }
    )
  }
}