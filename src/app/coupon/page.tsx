'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import ScratchCard from '@/components/ScratchCard'

// 0-99 index lottery table based on probability
const LOTTERY_TABLE = [
  // 0-4: empty (5%)
  ...Array(5).fill('empty'),
  // 5-74: 10% OFF (70%) - only discount_10 and discount_20 allowed in DB
  ...Array(70).fill('discount_10'),
  // 75-99: 20% OFF (25%)
  ...Array(25).fill('discount_20')
]

const COUPON_DESIGNS = {
  empty: {
    name: 'OOPS!',
    message: 'Sorry! Better luck next time!',
    bgColor: 'bg-gradient-to-br from-gray-400 to-gray-600',
    emoji: '😢',
    funEmoji: '🎪🤡'
  },
  discount_5: {
    name: '5% OFF',
    message: 'Congratulations! 5% Discount Coupon!',
    bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
    emoji: '🎉'
  },
  discount_10: {
    name: '10% OFF', 
    message: 'Congratulations! 10% Discount Coupon!',
    bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
    emoji: '🎊'
  },
  discount_20: {
    name: '20% OFF',
    message: 'Congratulations! 20% Discount Coupon!',
    bgColor: 'bg-gradient-to-br from-red-400 to-red-600', 
    emoji: '🎯'
  }
}

export default function CouponPage() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [result, setResult] = useState<{
    type: string;
    name: string;
    message: string;
    bgColor: string;
    emoji: string;
    funEmoji?: string;
  } | null>(null)
  const [couponUsed, setCouponUsed] = useState(false)
  const [scratchCompleted, setScratchCompleted] = useState(false)

  useEffect(() => {
    // Check customer ID
    const storedCustomerId = localStorage.getItem('tagstamp_customer_id')
    if (!storedCustomerId) {
      router.push('/')
      return
    }
    setCustomerId(storedCustomerId)
  }, [router])

  const startGame = () => {
    // Generate random index 0-99
    const randomIndex = Math.floor(Math.random() * 100)
    const selectedCoupon = LOTTERY_TABLE[randomIndex]
    
    setResult({
      type: selectedCoupon,
      ...COUPON_DESIGNS[selectedCoupon as keyof typeof COUPON_DESIGNS]
    })
    setGameStarted(true)
  }

  const handleScratchComplete = () => {
    // Scratch animation completed - show result and buttons
    setScratchCompleted(true)
  }

  const handleUseCoupon = async () => {
    if (!customerId || !result || result.type === 'empty') {
      console.log('Cannot use coupon:', { customerId, result })
      alert('Invalid coupon data')
      return
    }

    console.log('Using coupon immediately:', { customerId, result: result.type })

    try {
      // Issue coupon to database
      console.log('Step 1: Issuing coupon to database...')
      const response = await fetch('/api/coupons/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          type: result.type
        }),
      })

      console.log('Issue response status:', response.status)
      const responseText = await response.text()
      console.log('Issue response body:', responseText)
      
      if (response.ok) {
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse issue response:', parseError)
          alert('Server response format error')
          return
        }
        
        console.log('Coupon issued successfully:', data)
        
        if (!data.coupon || !data.coupon.id) {
          console.error('No coupon ID in response:', data)
          alert('Invalid coupon response from server')
          return
        }
        
        // Use coupon immediately
        console.log('Step 2: Using coupon immediately...')
        const useResponse = await fetch('/api/coupons/use', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coupon_id: data.coupon.id,
            customer_id: customerId
          }),
        })

        console.log('Use response status:', useResponse.status)
        const useResponseText = await useResponse.text()
        console.log('Use response body:', useResponseText)

        if (useResponse.ok) {
          let useData
          try {
            useData = JSON.parse(useResponseText)
          } catch (parseError) {
            console.error('Failed to parse use response:', parseError)
            alert('Server response format error')
            return
          }
          
          console.log('Coupon used successfully:', useData)
          setCouponUsed(true)
          alert('Coupon used successfully! Admin has been notified.')
        } else {
          let errorData
          try {
            errorData = JSON.parse(useResponseText)
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError)
            alert(`Failed to use coupon: ${useResponseText}`)
            return
          }
          console.error('Use coupon failed:', errorData)
          alert(`Failed to use coupon: ${errorData.error}`)
        }
      } else {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          alert(`Failed to issue coupon: ${responseText}`)
          return
        }
        console.error('Issue coupon failed:', errorData)
        alert(`Failed to issue coupon: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Coupon use error:', error)
      alert(`Network error: ${error.message}`)
    }
  }


  const handleComplete = async () => {
    console.log('handleComplete called:', { result: result?.type, customerId, couponUsed })
    
    // Mark this customer as having completed lottery event in this session
    if (customerId) {
      sessionStorage.setItem(`lottery_completed_${customerId}`, 'true')
    }
    
    // If winning result and not already used, save coupon to database for later use
    if (result && result.type !== 'empty' && customerId && !couponUsed) {
      try {
        console.log('Done button: Saving winning coupon for later use:', { customerId, couponType: result.type })
        
        const response = await fetch('/api/coupons/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: customerId,
            type: result.type
          }),
        })

        console.log('Done button - Issue response status:', response.status)
        const responseText = await response.text()
        console.log('Done button - Issue response body:', responseText)

        if (response.ok) {
          let data
          try {
            data = JSON.parse(responseText)
            console.log('Done button: Coupon saved successfully for later use:', data)
          } catch (parseError) {
            console.error('Done button: Failed to parse response:', parseError)
          }
        } else {
          let errorData
          try {
            errorData = JSON.parse(responseText)
            console.error('Done button: Failed to save coupon:', errorData)
          } catch (parseError) {
            console.error('Done button: Failed to parse error response:', parseError, responseText)
          }
        }
      } catch (error) {
        console.error('Done button: Network error saving coupon:', error)
      }
    } else {
      console.log('Done button: No coupon to save:', { 
        hasResult: !!result, 
        resultType: result?.type, 
        hasCustomerId: !!customerId, 
        couponUsed 
      })
    }
    
    // IMPORTANT: Done button ALWAYS closes browser (after coupon processing if needed)
    try {
      if (window.opener) {
        window.close()
      } else {
        window.close()
        setTimeout(() => {
          window.location.href = 'about:blank'
        }, 100)
      }
    } catch (error) {
      console.error('Error closing window:', error)
      try {
        window.location.href = 'about:blank'
      } catch {
        window.history.back()
      }
    }
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 px-6 py-6">
      <div className="flex flex-col items-center">
        <Logo size="lg" showText={false} />
        
        {!gameStarted ? (
          <div className="mt-8 text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-2 border-orange-200">
              <div className="text-6xl mb-4">🎁</div>
              <h1 className="text-2xl font-bold text-orange-600 mb-4">
                Congratulations!
              </h1>
              <p className="text-lg text-gray-700 mb-6">
You&apos;ve collected 5 stamps!<br />
                You&apos;ve won a random coupon lottery!<br />
                Ready to discover your prize?
              </p>
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                🎮 PLAY
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Scratch to reveal your prize!
            </h2>
            
            <ScratchCard
              result={result}
              onComplete={handleScratchComplete}
            />

{scratchCompleted && (
              <div className="mt-6">
                {result.type === 'empty' ? (
                  // Empty result - encouragement message
                  <p className="text-lg text-gray-700 mb-6 text-center">
                    We hope you win next time!
                  </p>
                ) : (
                  // Winning result - show USE NOW button
                  <>
                    <button
                      onClick={handleUseCoupon}
                      disabled={couponUsed}
                      className={`
                        w-full px-6 py-3 rounded-lg font-bold transition-all duration-200 mb-3
                        ${couponUsed 
                          ? 'bg-red-500 text-white cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                        }
                      `}
                    >
                      {couponUsed ? 'USED' : 'USE NOW'}
                    </button>
                  </>
                )}
                
                {/* Done button for both cases */}
                <button
                  onClick={handleComplete}
                  className="w-full px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}