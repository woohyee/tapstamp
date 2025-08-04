'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import ScratchCard from '@/components/ScratchCard'
import { closeBrowserOrRedirect } from '@/utils/browserUtils'

// 0-99 index lottery table based on probability (사용자 재설정)
const LOTTERY_TABLE = [
  // 0-54: 5% OFF (55%)
  ...Array(55).fill('discount_5'),
  // 55-79: 10% OFF (25%) 
  ...Array(25).fill('discount_10'),
  // 80-94: 15% OFF (15%)
  ...Array(15).fill('discount_15'),
  // 95-99: 20% OFF (5%)
  ...Array(5).fill('discount_20')
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
  discount_15: {
    name: '15% OFF',
    message: 'Congratulations! 15% Discount Coupon!',
    bgColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
    emoji: '🎪'
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
  const [couponSavedForLater, setCouponSavedForLater] = useState(false)
  const [useLaterMessage, setUseLaterMessage] = useState(false)
  const [useNowComplete, setUseNowComplete] = useState(false)
  const [pendingCouponId, setPendingCouponId] = useState<string | null>(null)

  useEffect(() => {
    // Check customer ID
    const storedCustomerId = localStorage.getItem('tagstamp_customer_id')
    if (!storedCustomerId) {
      // 🚨 CRITICAL: customer_id 없을 시 브라우저 닫기 (google.com으로 리다이렉트)
      closeBrowserOrRedirect()
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
    if (!customerId || !result) {
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
        
        // Store coupon ID for later use (when Done button is clicked)
        console.log('Step 2: Storing coupon ID for confirmation...')
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
          
          console.log('Coupon ready for use - pending confirmation')
          setPendingCouponId(data.coupon.id)
          setCouponUsed(true)
          // Show completion message - user must click Done to actually use coupon
          setTimeout(() => {
            setUseNowComplete(true)
          }, 1000)
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
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUseLater = async () => {
    if (!customerId || !result) {
      console.log('Cannot save coupon for later:', { customerId, result })
      alert('Invalid coupon data')
      return
    }

    console.log('Saving coupon for later use:', { customerId, result: result.type })

    try {
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

      console.log('Use Later - Issue response status:', response.status)
      const responseText = await response.text()
      console.log('Use Later - Issue response body:', responseText)
      
      if (response.ok) {
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse issue response:', parseError)
          alert('Server response format error')
          return
        }
        
        console.log('Coupon saved for later successfully:', data)
        setCouponSavedForLater(true)
        // Show message instead of auto-exit
        setUseLaterMessage(true)
      } else {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          alert(`Failed to save coupon: ${responseText}`)
          return
        }
        console.error('Save coupon failed:', errorData)
        alert(`Failed to save coupon: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Coupon save error:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleGameComplete = async () => {
    console.log('handleGameComplete called:', { result: result?.type, customerId, couponUsed })
    
    // Mark this customer as having completed lottery event in this session
    if (customerId) {
      sessionStorage.setItem(`lottery_completed_${customerId}`, 'true')
    }
    
    // If winning result and not already used or saved, save coupon to database for later use
    if (result && customerId && !couponUsed && !couponSavedForLater) {
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
        closeBrowserOrRedirect()
      } else {
        closeBrowserOrRedirect()
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

  // USE LATER Message Screen
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
                  Coupon Saved!
                </h1>
                <p className="text-gray-600 mb-6 text-base">
                  Your coupon will be available for your next visit.
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

  // USE NOW Complete Message Screen
  if (useNowComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-1 py-0">
        <div className="w-full max-w-sm mx-auto h-screen flex flex-col">
          <div className="bg-white rounded-3xl shadow-2xl px-6 py-0 text-center border-2 border-green-200 flex-1 flex flex-col relative">
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
                <div className="text-6xl mb-4">💚</div>
                <h1 className="text-xl font-black text-green-700 mb-4">
                  Coupon Used Successfully!
                </h1>
                <p className="text-lg text-green-600 font-medium mb-6">
                  Your discount has been applied.
                  <br />
                  Thank you for visiting!
                </p>
                
                <button
                  onClick={closeBrowserOrRedirect}
                  className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-4 px-6 rounded-xl hover:from-green-500 hover:to-blue-600 font-bold shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-lg"
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
            <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border-2 border-orange-200">
              <div className="text-center">
                <div className="text-6xl mb-6">🎉</div>
                
                <h1 className="text-3xl font-bold text-orange-600 mb-4">
                  Congratulations!
                </h1>
                
                <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-2xl p-6 mb-6">
                  <h2 className="text-xl font-bold text-orange-700 mb-2">
                    5 Stamps Achievement!
                  </h2>
                  <p className="text-lg text-gray-700">
                    You've won a random coupon lottery!
                  </p>
                </div>
                
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-4 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  🎰 PLAY LOTTERY
                </button>
                
                <div className="mt-4 text-sm text-gray-600">
                  Touch to reveal your prize!
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Scratch to reveal your prize!
            </h2>
            
            {result && (
              <ScratchCard
                result={result}
                onComplete={handleScratchComplete}
              />
            )}

{scratchCompleted && result && (
              <div className="mt-6">
                {/* Always winning result - show coupon action buttons or confirmation */}
                {couponSavedForLater ? (
                  // Coupon saved for later confirmation
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                    <div className="text-green-700 text-center">
                      <div className="text-2xl mb-2">✅</div>
                      <h3 className="font-bold text-lg mb-2">Coupon Saved!</h3>
                      <p className="text-sm">
                        Your coupon has been saved successfully.<br/>
                        You can use it anytime!
                      </p>
                    </div>
                  </div>
                ) : couponUsed ? (
                  // Coupon already used confirmation
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                    <div className="text-red-700 text-center">
                      <div className="text-2xl mb-2">✅</div>
                      <h3 className="font-bold text-lg mb-2">Coupon Used!</h3>
                      <p className="text-sm">Admin has been notified.</p>
                    </div>
                  </div>
                ) : (
                  // Show action buttons - guaranteed winners
                  <div className="space-y-3 mb-4">
                    <button
                      onClick={handleUseCoupon}
                      className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      💰 USE NOW
                    </button>
                    <button
                      onClick={handleUseLater}
                      className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      📅 USE LATER
                    </button>
                  </div>
                )}
                
                {/* Done button */}
                <button
                  onClick={handleGameComplete}
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