'use client'

import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'

export const dynamic = 'force-dynamic'

interface RecentCoupon {
  id: string
  type: string
  value: number
  used_at?: string
  created_at?: string
  expires_at?: string
  customer_name: string
  customer_phone: string
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [currentCoupon, setCurrentCoupon] = useState<RecentCoupon | null>(null)
  const [notifiedCoupons, setNotifiedCoupons] = useState<Set<string>>(new Set())
  const [alertCount, setAlertCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [isOnline, setIsOnline] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'history' | 'pending'>('main')
  const [couponHistory, setCouponHistory] = useState<RecentCoupon[]>([])
  const [pendingCoupons, setPendingCoupons] = useState<RecentCoupon[]>([])
  
  // Notification sound (temporarily disabled)
  const playNotificationSound = () => {
    console.log('🔊 Notification sound triggered (disabled for testing)')
    // try {
    //   for (let i = 0; i < 3; i++) {
    //     setTimeout(() => {
    //       const audioContext = new AudioContext()
    //       const oscillator = audioContext.createOscillator()
    //       const gainNode = audioContext.createGain()
    //       
    //       oscillator.connect(gainNode)
    //       gainNode.connect(audioContext.destination)
    //       
    //       oscillator.frequency.value = 1000 + (i * 200)
    //       oscillator.type = 'sine'
    //       gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    //       
    //       oscillator.start()
    //       oscillator.stop(audioContext.currentTime + 0.3)
    //     }, i * 400)
    //   }
    // } catch (error) {
    //   console.log('⚠️ Audio unavailable:', error)
    // }
  }

  // Initialize with existing data for menu access, but don't show alerts
  useEffect(() => {
    if (!isLoggedIn) return

    console.log('🚀 Loading existing data for menu access...')
    
    const loadExistingData = async () => {
      try {
        // Load used coupons
        const usedResponse = await fetch('/api/coupons/recent')
        const usedData = await usedResponse.json()
        
        if (usedData.success && usedData.coupons?.length > 0) {
          // Store full history for menu access only
          setCouponHistory(usedData.coupons)
          // Mark all existing coupons as already notified (no alerts for old data)
          const existingIds = usedData.coupons.map((c: RecentCoupon) => c.id)
          setNotifiedCoupons(new Set(existingIds))
        }

        // Load pending coupons
        const pendingResponse = await fetch('/api/coupons/pending')
        const pendingData = await pendingResponse.json()
        
        if (pendingData.success && pendingData.coupons?.length > 0) {
          setPendingCoupons(pendingData.coupons)
        }
      } catch (error) {
        console.error('❌ Data loading error:', error)
      }
    }

    loadExistingData()
  }, [isLoggedIn])

  // Real-time coupon monitoring system (NEW coupons only)
  useEffect(() => {
    if (!isLoggedIn || notifiedCoupons.size === 0) return // Wait until initial data is loaded

    console.log('🚀 Starting real-time coupon monitoring...')
    
    const checkNewCoupons = async () => {
      try {
        // Check used coupons
        const usedResponse = await fetch('/api/coupons/recent')
        const usedData = await usedResponse.json()
        
        // Check pending coupons
        const pendingResponse = await fetch('/api/coupons/pending')
        const pendingData = await pendingResponse.json()
        
        setLastUpdate(new Date().toLocaleTimeString())
        setIsOnline(true)
        
        // Update used coupons
        if (usedData.success && usedData.coupons?.length > 0) {
          // Update full history for menu
          setCouponHistory(usedData.coupons)
          
          // Check for NEW coupon usage only
          const newCoupons = usedData.coupons.filter((coupon: RecentCoupon) => 
            coupon.used_at && !notifiedCoupons.has(coupon.id)
          )
          
          if (newCoupons.length > 0) {
            const latestCoupon = newCoupons[0]
            console.log('🚨 NEW COUPON USED NOW!', latestCoupon)
            
            // Show current coupon prominently
            setCurrentCoupon(latestCoupon)
            
            // Auto-clear current coupon after 30 seconds
            setTimeout(() => {
              setCurrentCoupon(null)
              console.log('🧹 Auto-cleared coupon notification after 30 seconds')
            }, 30000)
            
            // Play notification sound (disabled for testing)
            // playNotificationSound()
            
            // Update alert counter
            setAlertCount(prev => prev + 1)
            
            // Mark as notified
            const newIds = newCoupons.map((c: RecentCoupon) => c.id)
            setNotifiedCoupons(prev => new Set([...prev, ...newIds]))
          }
        }

        // Update pending coupons
        if (pendingData.success && pendingData.coupons?.length >= 0) {
          setPendingCoupons(pendingData.coupons)
          console.log('📋 Updated pending coupons:', pendingData.coupons.length)
        }
      } catch (error) {
        console.error('❌ Coupon check error:', error)
        setIsOnline(false)
      }
    }
    
    // Check every 2 seconds for NEW coupons only
    const interval = setInterval(checkNewCoupons, 2000)
    
    return () => {
      clearInterval(interval)
    }
  }, [isLoggedIn, notifiedCoupons])

  const handleLogin = () => {
    if (password === '1234') {
      console.log('✅ Admin login successful!')
      setIsLoggedIn(true)
      setNotifiedCoupons(new Set())
      setAlertCount(0)
      
      // 로그인 후 페이지 최상단으로 스크롤
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } else {
      alert('Incorrect password.')
    }
  }

  const dismissCurrentCoupon = () => {
    setCurrentCoupon(null)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center px-6 py-6">
        <Logo size="lg" />
        
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-blue-600 mb-4">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentView('main')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-blue-600">Coupon History</h1>
          </div>

          <div className="bg-white/90 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-orange-600 mb-4">🎫 All Coupon Usage History</h2>
            
            {couponHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-gray-500 text-lg">No coupons used yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {couponHistory.map((coupon, index) => (
                  <div key={coupon.id} className="p-5 rounded-xl border-2 shadow-lg bg-gray-50 border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{coupon.customer_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            coupon.value >= 20 ? 'bg-red-500 text-white' : 
                            coupon.value >= 15 ? 'bg-purple-500 text-white' :
                            coupon.value >= 10 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                          }`}>
                            {coupon.value}% OFF
                          </span>
                        </div>
                        <p className="text-gray-600 font-medium">{coupon.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {coupon.used_at ? new Date(coupon.used_at).toLocaleDateString() : 'N/A'} {coupon.used_at ? new Date(coupon.used_at).toLocaleTimeString() : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentView('main')}
              className="flex items-center space-x-2 text-orange-600 hover:text-orange-800"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-orange-600">Pending Coupons</h1>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/coupons/pending')
                  const data = await response.json()
                  if (data.success) {
                    setPendingCoupons(data.coupons || [])
                  }
                } catch (error) {
                  console.error('Refresh error:', error)
                }
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="bg-white/90 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-yellow-600 mb-4">⏳ USE LATER Saved Coupons</h2>
            
            {pendingCoupons.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-gray-500 text-lg">No pending coupons</p>
                <p className="text-sm text-gray-400 mt-2">Coupons saved with "USE LATER" will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingCoupons.map((coupon, index) => (
                  <div key={coupon.id} className="p-5 rounded-xl border-2 shadow-lg bg-yellow-50 border-yellow-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{coupon.customer_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            coupon.value >= 20 ? 'bg-red-500 text-white' : 
                            coupon.value >= 15 ? 'bg-purple-500 text-white' :
                            coupon.value >= 10 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                          }`}>
                            {coupon.value}% OFF
                          </span>
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                            PENDING
                          </span>
                        </div>
                        <p className="text-gray-600 font-medium">{coupon.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Created: {coupon.created_at ? new Date(coupon.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-xs text-red-500">
                          Expires: {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-4">
      <div className="max-w-md mx-auto">
        {/* Mobile Header */}
        <div className="flex flex-col items-center mb-6">
          <Logo size="2xl" showText={false} />
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-lg"
          >
            ☰ Menu
          </button>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-6 top-20 bg-white rounded-lg shadow-xl p-2 z-10 min-w-56">
            <div className="text-xs text-gray-500 px-4 py-2 border-b">MANAGEMENT</div>
            
            <button
              onClick={() => {
                alert('Customer Management - Coming Soon')
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center space-x-3"
            >
              <span>👥</span>
              <div>
                <div className="font-medium">Customer Management</div>
                <div className="text-xs text-gray-500">Edit customer info & stamps</div>
              </div>
            </button>
            
            <button
              onClick={() => {
                window.location.href = '/admin/stats'
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center space-x-3"
            >
              <span>📈</span>
              <div>
                <div className="font-medium">Statistics & Reports</div>
                <div className="text-xs text-gray-500">Analytics & sales data</div>
              </div>
            </button>
            
            <div className="text-xs text-gray-500 px-4 py-2 border-b border-t mt-1">HISTORY</div>
            
            <button
              onClick={() => {
                setCurrentView('history')
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center space-x-3"
            >
              <span>📊</span>
              <div>
                <div className="font-medium">Used Coupons</div>
                <div className="text-xs text-gray-500">All past coupon usage</div>
              </div>
            </button>
            
            <button
              onClick={() => {
                setCurrentView('pending')
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center space-x-3"
            >
              <span>⏳</span>
              <div>
                <div className="font-medium">Pending Coupons</div>
                <div className="text-xs text-gray-500">USE LATER saved coupons</div>
              </div>
            </button>
            
            <button
              onClick={() => {
                window.location.reload()
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center space-x-3"
            >
              <span>🔄</span>
              <div>
                <div className="font-medium">Refresh</div>
                <div className="text-xs text-gray-500">Reload system data</div>
              </div>
            </button>
            
            <div className="text-xs text-gray-500 px-4 py-2 border-b border-t mt-1">SYSTEM</div>
            
            <button
              onClick={() => {
                setIsLoggedIn(false)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded text-red-600 flex items-center space-x-3"
            >
              <span>🚪</span>
              <div>
                <div className="font-medium">Logout</div>
                <div className="text-xs text-gray-400">Exit admin panel</div>
              </div>
            </button>
          </div>
        )}


        {/* Current Coupon Alert - Mobile Optimized */}
        {currentCoupon ? (
          <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-2xl p-6 mb-6 text-white animate-pulse">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-3">🎫 COUPON USED!</h2>
              <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
                <h3 className="text-xl font-bold mb-1">{currentCoupon.customer_name}</h3>
                <p className="text-lg opacity-90 mb-3">{currentCoupon.customer_phone}</p>
                <div className="bg-white text-gray-800 px-4 py-2 rounded-full text-lg font-bold">
                  {currentCoupon.value}% DISCOUNT
                </div>
                <p className="text-sm opacity-75 mt-2">
                  {currentCoupon.used_at ? new Date(currentCoupon.used_at).toLocaleTimeString() : 'Just now'}
                </p>
              </div>
              <button
                onClick={dismissCurrentCoupon}
                className="w-full py-3 bg-white text-gray-800 rounded-xl font-bold shadow-lg"
              >
                ✓ Got it!
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 rounded-2xl shadow-xl p-6 text-center">
            <div className="text-4xl mb-3">🎫</div>
            <h2 className="text-lg font-bold text-gray-600 mb-2">Waiting for Customer</h2>
            <p className="text-gray-500 text-sm">Coupon usage alerts will appear here</p>
            <div className="mt-4 text-xs text-gray-400">
              Last check: {lastUpdate || 'Just now'}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}