'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'
import { closeBrowserOrRedirect } from '@/utils/browserUtils'

export const dynamic = 'force-dynamic'

interface AvailableCoupon {
  id: string
  value: number
  expires_at: string
}

export default function AlertCouponPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [stamps, setStamps] = useState<number>(0)
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get data from URL params
    const customerIdParam = searchParams.get('customer_id')
    const stampsParam = searchParams.get('stamps')
    
    if (!customerIdParam || !stampsParam) {
      router.push('/')
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
        // Remove used coupon from the list
        setAvailableCoupons(prev => prev.filter(c => c.id !== couponId))
        if (availableCoupons.length <= 1) {
          // No more coupons, go back to main
          router.push('/')
        }
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
    // Go back to stamp confirmation page
    router.push(`/?customer_id=${customerId}&stamps=${stamps}&from_coupon_alert=true`)
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
    router.push('/')
    return null
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
                <button
                  onClick={() => {
                    if (availableCoupons.length > 0) {
                      handleUseCoupon(availableCoupons[0].id)
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-2xl transform hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                >
                  ✅ Yes, Use Now
                </button>
                
                <button
                  onClick={handleUseLater}
                  className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-2xl transform hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                >
                  ❌ No, Use Later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}