'use client'

import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RecentCoupon {
  id: string
  type: string
  value: number
  used_at: string
  customer_name: string
  customer_phone: string
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [recentCoupons, setRecentCoupons] = useState<RecentCoupon[]>([])
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [lastCheckTime, setLastCheckTime] = useState(Date.now())

  useEffect(() => {
    // 브라우저 알림 권한 요청
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return

    // 실시간 쿠폰 사용 내역 폴링 (3초마다)
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/coupons/recent?since=${lastCheckTime}`)
        const data = await response.json()
        
        if (data.success && data.coupons.length > 0) {
          // 새로운 쿠폰 사용이 있으면 알림
          const newCoupons = data.coupons.filter((coupon: RecentCoupon) => 
            new Date(coupon.used_at).getTime() > lastCheckTime
          )
          
          if (newCoupons.length > 0) {
            // 브라우저 알림
            if (notificationPermission === 'granted') {
              const latestCoupon = newCoupons[0]
              new Notification('🎫 쿠폰 사용됨!', {
                body: `${latestCoupon.customer_name} (${latestCoupon.customer_phone}) - ${latestCoupon.value}% 할인`,
                icon: '/favicon.ico'
              })
              
              // 알림 소리 (간단한 beep)
              const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
              const oscillator = audioContext.createOscillator()
              const gainNode = audioContext.createGain()
              
              oscillator.connect(gainNode)
              gainNode.connect(audioContext.destination)
              
              oscillator.frequency.value = 800
              oscillator.type = 'sine'
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
              
              oscillator.start()
              oscillator.stop(audioContext.currentTime + 0.2)
            }
            
            setRecentCoupons(data.coupons)
            setLastCheckTime(Date.now())
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent coupons:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isLoggedIn, lastCheckTime, notificationPermission])

  const handleLogin = () => {
    if (password === '123') {
      setIsLoggedIn(true)
      setLastCheckTime(Date.now())
    } else {
      alert('비밀번호가 틀렸습니다.')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center px-6 py-6">
        <Logo size="lg" />
        
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-blue-600 mb-4">관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg"
          >
            로그인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Logo size="md" />
          <h1 className="text-2xl font-bold text-blue-600">관리자 대시보드</h1>
        </div>

        {/* 알림 상태 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-blue-600 mb-4">🔔 실시간 알림 상태</h2>
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${notificationPermission === 'granted' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">
              {notificationPermission === 'granted' ? '알림 활성화됨' : '알림 비활성화됨'}
            </span>
            {notificationPermission !== 'granted' && (
              <button 
                onClick={() => Notification.requestPermission().then(setNotificationPermission)}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg"
              >
                알림 허용
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            고객이 쿠폰을 사용하면 즉시 알림이 표시됩니다.
          </p>
        </div>

        {/* 최근 쿠폰 사용 내역 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-blue-600 mb-4">🎫 최근 쿠폰 사용 내역</h2>
          
          {recentCoupons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">아직 사용된 쿠폰이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {recentCoupons.map((coupon, index) => (
                <div key={coupon.id} className={`p-4 rounded-lg border-l-4 ${index === 0 ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{coupon.customer_name}</h3>
                      <p className="text-sm text-gray-600">{coupon.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                        {coupon.value}% 할인
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(coupon.used_at).toLocaleString()}
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