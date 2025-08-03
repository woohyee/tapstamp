import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

interface StatsData {
  // 기본 통계
  totalCustomers: number
  totalStamps: number
  totalCouponsIssued: number
  totalCouponsUsed: number
  
  // 일별 스탬프 (최근 30일)
  dailyStamps: Array<{
    date: string
    count: number
  }>
  
  // 주별 스탬프 (최근 12주)
  weeklyStamps: Array<{
    week: string
    count: number
  }>
  
  // 월별 스탬프 (최근 12개월)
  monthlyStamps: Array<{
    month: string
    count: number
  }>
  
  // 이벤트 참여 현황
  eventStats: {
    lottery: number // 5개 스탬프 랜덤 쿠폰 이벤트 참여자
    // 향후 추가될 이벤트들
  }
  
  // 쿠폰 타입별 통계
  couponStats: Array<{
    type: string
    name: string
    issued: number
    used: number
    usageRate: number // 사용률 %
  }>
  
  // 고객 레벨별 분포
  customerLevels: {
    newbies: number      // 1-4개 스탬프
    regular: number      // 5-9개 스탬프  
    loyal: number        // 10-19개 스탬프
    vip: number         // 20개+ 스탬프
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Generating comprehensive admin statistics...')
    
    // 날짜 범위 설정
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000))
    const twelveWeeksAgo = new Date(today.getTime() - (12 * 7 * 24 * 60 * 60 * 1000))
    const twelveMonthsAgo = new Date(today.getTime() - (12 * 30 * 24 * 60 * 60 * 1000))
    
    // 1. 기본 통계 수집
    const [customersSnapshot, stampsSnapshot, couponsSnapshot, eventsSnapshot] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'stamps')),
      getDocs(collection(db, 'coupons')),
      getDocs(collection(db, 'events'))
    ])
    
    const totalCustomers = customersSnapshot.size
    const totalStamps = stampsSnapshot.size
    const totalCouponsIssued = couponsSnapshot.size
    const totalCouponsUsed = couponsSnapshot.docs.filter(doc => doc.data().used).length
    
    // 2. 일별 스탬프 통계 (최근 30일)
    const dailyStamps = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      
      const dayStamps = stampsSnapshot.docs.filter(doc => {
        const stampDate = doc.data().created_at?.toDate()
        return stampDate && stampDate >= dayStart && stampDate < dayEnd
      }).length
      
      dailyStamps.push({
        date: dateStr,
        count: dayStamps
      })
    }
    
    // 3. 주별 스탬프 통계 (최근 12주)
    const weeklyStamps = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today.getTime() - (i * 7 * 24 * 60 * 60 * 1000))
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // 주 시작일 (일요일)
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000))
      
      const weekStamps = stampsSnapshot.docs.filter(doc => {
        const stampDate = doc.data().created_at?.toDate()
        return stampDate && stampDate >= weekStart && stampDate < weekEnd
      }).length
      
      weeklyStamps.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        count: weekStamps
      })
    }
    
    // 4. 월별 스탬프 통계 (최근 12개월)
    const monthlyStamps = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
      
      const monthStamps = stampsSnapshot.docs.filter(doc => {
        const stampDate = doc.data().created_at?.toDate()
        return stampDate && stampDate >= monthStart && stampDate < monthEnd
      }).length
      
      monthlyStamps.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: monthStamps
      })
    }
    
    // 5. 이벤트 참여 현황
    const lotteryEvents = eventsSnapshot.docs.filter(doc => 
      doc.data().event_type === 'lottery'
    ).length
    
    // 6. 쿠폰 타입별 통계
    const couponTypes = {
      'discount_5': { name: '5% Discount', issued: 0, used: 0 },
      'discount_10': { name: '10% Discount', issued: 0, used: 0 },
      'discount_15': { name: '15% Discount', issued: 0, used: 0 },
      'discount_20': { name: '20% Discount', issued: 0, used: 0 },
      'event_reward': { name: 'Event Reward', issued: 0, used: 0 }
    }
    
    couponsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const type = data.type
      if (couponTypes[type]) {
        couponTypes[type].issued++
        if (data.used) {
          couponTypes[type].used++
        }
      }
    })
    
    const couponStats = Object.entries(couponTypes).map(([type, stats]) => ({
      type,
      name: stats.name,
      issued: stats.issued,
      used: stats.used,
      usageRate: stats.issued > 0 ? Math.round((stats.used / stats.issued) * 100) : 0
    }))
    
    // 7. 고객 레벨별 분포
    const customerLevels = { newbies: 0, regular: 0, loyal: 0, vip: 0 }
    customersSnapshot.docs.forEach(doc => {
      const stamps = doc.data().stamps || 0
      if (stamps <= 4) customerLevels.newbies++
      else if (stamps <= 9) customerLevels.regular++
      else if (stamps <= 19) customerLevels.loyal++
      else customerLevels.vip++
    })
    
    const statsData: StatsData = {
      totalCustomers,
      totalStamps,
      totalCouponsIssued,
      totalCouponsUsed,
      dailyStamps,
      weeklyStamps,
      monthlyStamps,
      eventStats: {
        lottery: lotteryEvents
      },
      couponStats,
      customerLevels
    }
    
    console.log('✅ Statistics generated successfully')
    return NextResponse.json({
      success: true,
      data: statsData
    })
    
  } catch (error) {
    console.error('❌ Statistics generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate statistics'
    }, { status: 500 })
  }
}