'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'
import { closeBrowserOrRedirect } from '@/utils/browserUtils'

export const dynamic = 'force-dynamic'

interface AvailableCoupon {
  id: string
  value: number
  expires_at: string
  used?: boolean
}

function AlertCouponContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [stamps, setStamps] = useState<number>(0)
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [useLaterMessage, setUseLaterMessage] = useState(false)

  useEffect(() => {
    // Get data from URL params
    const customerIdParam = searchParams.get('customer_id')
    const stampsParam = searchParams.get('stamps')
    
    if (!customerIdParam || !stampsParam) {
      // 🚨 CRITICAL: 파라미터 없을 시 브라우저 닫기 (파라미터 없는 홈페이지 이동 방지)
      closeBrowserOrRedirect()
      return
    }
    
    setCustomerId(customerIdParam)
    setStamps(parseInt(stampsParam))
    
    // Load available coupons
    loadAvailableCoupons(customerIdParam)
  }, [router, searchParams])

  const loadAvailableCoupons = async (customerId: string) => {
    try {
      const response = await fetch(`/api/coupons/check?customer_id=${customerId}`)
      const data = await response.json()
      
      if (data.success && data.hasUnusedCoupons && data.coupons.length > 0) {
        setAvailableCoupons(data.coupons)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading coupons:', error)
      setLoading(false)
    }
  }

  const handleUseCoupon = async (couponId: string) => {
    try {
      const response = await fetch('/api/coupons/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coupon_id: couponId,
          customer_id: customerId
        }),
      })

      if (response.ok) {
        alert('Coupon used successfully! Admin has been notified.')
        // Mark coupon as used instead of removing it
        setAvailableCoupons(prev => prev.map(c => 
          c.id === couponId ? { ...c, used: true } : c
        ))
        
        // Auto redirect after 3 seconds if all coupons are used
        setTimeout(() => {
          const allUsed = availableCoupons.every(c => c.used || c.id === couponId)
          if (allUsed) {
            // 🚨 CRITICAL: 모든 쿠폰 사용 완료 시 브라우저 닫기 (파라미터 없는 홈페이지 이동 방지)
            closeBrowserOrRedirect()
          }
        }, 3000)
      } else {
        const errorData = await response.json()
        alert(`Failed to use coupon: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error using coupon:', error)
      alert('Error using coupon. Please try again.')
    }
  }

  const handleUseLater = () => {
    // 🎯 사용자에게 "쿠폰 사용하지 않음" 메시지 표시
    setUseLaterMessage(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium text-lg">Loading your coupons...</p>
        </div>
      </div>
    )
  }

  if (availableCoupons.length === 0) {
    // 🚨 CRITICAL: 쿠폰 없을 시 브라우저 닫기 (파라미터 없는 홈페이지 이동 방지)
    closeBrowserOrRedirect()
    return null
  }

  // 🎯 "Use Later" 메시지 화면
  if (useLaterMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-1 py-0">
        <div className="w-full max-w-sm mx-auto h-screen flex flex-col">
          <div className="bg-white rounded-3xl shadow-2xl px-6 py-0 text-center border-2 border-blue-200 flex-1 flex flex-col relative">
            <div className="absolute top-6 left-6 z-50">
              <p className="text-base text-blue-800 font-bold bg-white/90 px-2 py-1 rounded">
                dodo cleaners
              </p>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-4 -mt-12">
                <Logo size="xl" showText={false} className="justify-center h-32" />
              </div>
              
              <div className="px-4">
                <div className="text-6xl mb-4">💾</div>
                <h1 className="text-xl font-bold mb-4 text-blue-600">
                  Coupons Saved!
                </h1>
                <p className="text-gray-600 mb-6 text-base">
                  Your coupons will be available for your next visit.
                </p>
                
                <button
                  onClick={closeBrowserOrRedirect}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl hover:from-blue-600 hover:to-green-600 font-semibold shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base"
                >
                  ✅ Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 px-1 py-0">
      <div className="w-full max-w-sm mx-auto h-screen flex flex-col">
        <div className="bg-white rounded-3xl shadow-2xl px-6 py-0 text-center border-2 border-red-200 flex-1 flex flex-col relative">
          <div className="absolute top-6 left-6 z-50">
            <p className="text-base text-blue-800 font-bold bg-white/90 px-2 py-1 rounded">
              dodo cleaners
            </p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-4 -mt-12">
              <Logo size="xl" showText={false} className="justify-center h-32" />
            </div>
            
            <div className="px-4 pb-4">
              {/* Alert Header */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 animate-bounce">⚠️</div>
                <h1 className="text-2xl font-black text-red-700 mb-2">
                  You have unused coupons!
                </h1>
                <p className="text-lg text-red-600 font-bold mb-4">
                  Would you like to use them now?
                </p>
                <div className="bg-green-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-green-700 font-medium">
                    ✅ Your stamp has been added! Now you have {stamps} stamps.
                  </p>
                </div>
              </div>
              
              {/* Coupon Cards */}
              <div className="space-y-4 mb-6">
                {availableCoupons.map((coupon) => (
                  <div key={coupon.id} className="bg-gradient-to-r from-orange-100 to-yellow-100 p-4 rounded-xl border-2 border-orange-200 shadow-lg">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🎫</div>
                      <div className="text-2xl font-black text-orange-600 mb-2">
                        {coupon.value}% OFF Coupon
                      </div>
                      <div className="text-sm text-gray-600">
                        Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {availableCoupons.length > 0 && availableCoupons[0].used ? (
                  // Used coupon - 입체감 있는 빨간색 버튼
                  <div className="w-full">
                    <button className="w-full bg-gradient-to-b from-red-400 via-red-500 to-red-700 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),_inset_0_-1px_0_rgba(0,0,0,0.1),_0_4px_15px_rgba(0,0,0,0.3),_0_8px_25px_rgba(220,38,38,0.4)] border border-red-600 cursor-not-allowed transform scale-[0.98] transition-all duration-200">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">🚫</span>
                        <span className="tracking-wider">USED COUPON</span>
                      </div>
                      <div className="text-sm mt-1 opacity-80">
                        This coupon has been used
                      </div>
                    </button>
                    
                    <button
                      onClick={() => closeBrowserOrRedirect()}
                      className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-semibold text-lg shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  // Available coupon - original buttons
                  <>
                    <button
                      onClick={() => {
                        if (availableCoupons.length > 0) {
                          handleUseCoupon(availableCoupons[0].id)
                        }
                      }}
                      className="w-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 hover:from-emerald-500 hover:to-emerald-800 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),_inset_0_-1px_0_rgba(0,0,0,0.1),_0_4px_15px_rgba(0,0,0,0.3),_0_8px_25px_rgba(16,185,129,0.4)] border border-emerald-600 transform hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">✅</span>
                        <span className="tracking-wider">USE NOW</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleUseLater}
                      className="w-full bg-gradient-to-b from-gray-400 via-gray-500 to-gray-700 hover:from-gray-500 hover:to-gray-800 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),_inset_0_-1px_0_rgba(0,0,0,0.1),_0_4px_15px_rgba(0,0,0,0.3),_0_8px_25px_rgba(107,114,128,0.4)] border border-gray-600 transform hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">⏰</span>
                        <span className="tracking-wider">USE LATER</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AlertCouponPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlertCouponContent />
    </Suspense>
  )
}