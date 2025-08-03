import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Clear all data API called')
    
    const collections = ['customers', 'stamps', 'coupons', 'events']
    const results = []
    
    for (const collectionName of collections) {
      console.log(`🧹 Clearing ${collectionName} collection...`)
      
      const snapshot = await getDocs(collection(db, collectionName))
      let deletedCount = 0
      
      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, document.id))
        deletedCount++
      }
      
      results.push({
        collection: collectionName,
        deletedCount
      })
      
      console.log(`✅ Cleared ${deletedCount} documents from ${collectionName}`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'All test data cleared successfully',
      results
    })
  } catch (error) {
    console.error('Clear all data API error:', error)
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    )
  }
}