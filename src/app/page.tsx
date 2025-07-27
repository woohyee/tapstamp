'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { Customer, CustomerRegistration } from '@/types'
import CustomerForm from '@/components/CustomerForm'
import Logo from '@/components/Logo'
import Fireworks from '@/components/Fireworks'
import CountUp from '@/components/CountUp'
import { closeBrowserOrRedirect } from '@/utils/browserUtils'
import { cartridgeRegistry } from '@/cartridges/base/CartridgeRegistry'
import { FiveStampLotteryCartridge } from '@/cartridges/5StampLottery'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [needPhoneNumber, setNeedPhoneNumber] = useState(false)
  const [prefilledPhone, setPrefilledPhone] = useState('')
  const [availableCoupons, setAvailableCoupons] = useState<{
    id: string;
    value: number;
    expires_at: string;
  }[]>([])
  const [showCoupons, setShowCoupons] = useState(false)

  useEffect(() => {
    // 카트리지 초기화
    const fiveStampLottery = new FiveStampLotteryCartridge()
    cartridgeRegistry.register('5StampLottery', fiveStampLottery)
    console.log('카트리지 등록 완료:', cartridgeRegistry.getRegisteredCartridges())
    
    checkCustomerAndProcess()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkCustomerAndProcess = async () => {
    try {
      const customerId = localStorage.getItem('tagstamp_customer_id')
      
      if (!customerId) {
        // localStorage 없음 - 전화번호 먼저 확인
        setNeedPhoneNumber(true)
        setLoading(false)
        return
      }

      // 기존 고객 - 정보 확인
      const customerDoc = await getDoc(doc(db, 'customers', customerId))

      if (!customerDoc.exists()) {
        // 잘못된 ID - 신규 고객으로 처리
        localStorage.removeItem('tagstamp_customer_id')
        setIsNewCustomer(true)
        setLoading(false)
        return
      }

      const data = { id: customerDoc.id, ...customerDoc.data() } as Customer

      // 기존 고객 - 세션에서 이미 처리되었는지 확인
      const sessionKey = `stamp_processed_${customerId}_${Date.now().toString().slice(0, -5)}` // 5분 단위로 구분
      const alreadyProcessed = sessionStorage.getItem(sessionKey)
      
      if (alreadyProcessed) {
        // 이미 이번 세션에서 스탬프 처리됨 - 정보만 표시
        setCustomer(data)
        setCompleted(true)
        setLoading(false)
        return
      }

      // 기존 고객 - 즉시 스탬프 적립
      await addStampToExistingCustomer(data, sessionKey)
    } catch {
      setError('System error occurred.')
      setLoading(false)
    }
  }

  const handlePhoneNumberCheck = async (phone: string) => {
    try {
      setLoading(true)
      
      // 전화번호로 기존 고객 확인
      const customersQuery = query(
        collection(db, 'customers'), 
        where('phone', '==', phone)
      )
      const existingSnapshot = await getDocs(customersQuery)
      
      if (!existingSnapshot.empty) {
        const existingCustomer = { 
          id: existingSnapshot.docs[0].id, 
          ...existingSnapshot.docs[0].data() 
        } as Customer
        // 기존 고객 발견 - localStorage 복구하고 스탬프 적립 진행
        localStorage.setItem('tagstamp_customer_id', existingCustomer.id)
        
        // 세션 체크
        const sessionKey = `stamp_processed_${existingCustomer.id}_${Date.now().toString().slice(0, -5)}`
        const alreadyProcessed = sessionStorage.getItem(sessionKey)
        
        if (alreadyProcessed) {
          setCustomer(existingCustomer)
          setCompleted(true)
          setNeedPhoneNumber(false)
          setLoading(false)
          return
        }
        
        // 스탬프 적립
        await addStampToExistingCustomer(existingCustomer, sessionKey)
        setNeedPhoneNumber(false)
      } else {
        // 신규 고객 - 전화번호를 그대로 가지고 등록 폼으로
        setPrefilledPhone(phone)
        setIsNewCustomer(true)
        setNeedPhoneNumber(false)
        setLoading(false)
      }
    } catch {
      setError('Failed to check phone number.')
      setLoading(false)
    }
  }

  const addStampToExistingCustomer = async (customerData: Customer, sessionKey: string) => {
    try {
      // 새로운 Stamp API 사용
      const response = await fetch('/api/stamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerData.id }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add stamp')
      }

      // 세션에 처리 완료 표시
      sessionStorage.setItem(sessionKey, 'true')

      setCustomer(data.customer)
      
      // 카트리지 시스템으로 이벤트 처리
      const cartridgeResult = await cartridgeRegistry.executeCartridge(data.customer.stamps, data.customer.id)
      if (cartridgeResult && cartridgeResult.success && cartridgeResult.redirect) {
        console.log('카트리지 리다이렉트:', cartridgeResult.redirect)
        window.location.href = cartridgeResult.redirect
        return
      }
      
      // Check for existing unused coupons
      await checkAvailableCoupons(data.customer.id)
      
      setCompleted(true)
      setLoading(false)
    } catch {
      setError('Failed to add stamp.')
      setLoading(false)
    }
  }

  const handleNewCustomerRegistration = async (customerData: CustomerRegistration) => {
    try {
      // 고객 등록
      const customerResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      })
      
      if (!customerResponse.ok) {
        const errorData = await customerResponse.json()
        throw new Error(errorData.error || '고객 등록에 실패했습니다.')
      }
      
      const { customer: newCustomer } = await customerResponse.json()

      // 로컬스토리지에 저장
      localStorage.setItem('tagstamp_customer_id', newCustomer.id)
      
      // 스탬프 API로 첫 스탬프 추가
      const response = await fetch('/api/stamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: newCustomer.id }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add first stamp')
      }
      
      setCustomer(data.customer)
      
      // 카트리지 시스템으로 이벤트 처리 (신규 고객도 해당)
      const cartridgeResult = await cartridgeRegistry.executeCartridge(data.customer.stamps, data.customer.id)
      if (cartridgeResult && cartridgeResult.success && cartridgeResult.redirect) {
        console.log('신규 고객 카트리지 리다이렉트:', cartridgeResult.redirect)
        window.location.href = cartridgeResult.redirect
        return
      }
      
      // Check for existing unused coupons (though unlikely for new customers)
      await checkAvailableCoupons(data.customer.id)
      
      setIsNewCustomer(false)
      setCompleted(true)
    } catch {
      setError('Failed to register customer.')
    }
  }

  const checkAvailableCoupons = async (customerId: string) => {
    try {
      const response = await fetch(`/api/coupons/check?customer_id=${customerId}`)
      const data = await response.json()
      
      if (data.success && data.hasUnusedCoupons) {
        setAvailableCoupons(data.coupons)
        setShowCoupons(true)
      }
    } catch (error) {
      console.error('Error checking coupons:', error)
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
          customer_id: customer?.id
        }),
      })

      if (response.ok) {
        alert('Coupon used successfully! Admin has been notified.')
        // Remove used coupon from the list
        setAvailableCoupons(prev => prev.filter(c => c.id !== couponId))
        if (availableCoupons.length <= 1) {
          setShowCoupons(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 text-xl mb-4">Error Occurred</div>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (needPhoneNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 px-1 py-0">
        <div className="w-full max-w-sm mx-auto h-screen flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-0 border border-orange-100 flex-1 flex flex-col relative">
            <div className="absolute top-6 left-6 z-50">
              <p className="text-base text-blue-800 font-bold bg-white/90 px-2 py-1 rounded">
                dodo cleaners
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-2 -mt-12">
                <Logo size="xl" showText={false} className="justify-center h-40" />
              </div>
              <div className="text-center px-4">
                <h1 className="text-lg font-bold text-center mb-2 text-gray-800">
                  Phone Number
                </h1>
                <p className="text-center text-gray-600 mb-4 text-sm">
                  Please enter your phone number
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const phone = formData.get('phone') as string
                  if (phone) {
                    handlePhoneNumberCheck(phone)
                  }
                }} className="space-y-4">
                  <input
                    name="phone"
                    type="tel"
                    placeholder="111-111-1111"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-yellow-600 font-semibold shadow-lg transform hover:scale-[1.02] transition-all duration-200 text-sm"
                  >
                    Continue
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isNewCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 px-1 py-0">
        <div className="w-full max-w-sm mx-auto h-screen flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-0 border border-orange-100 flex-1 flex flex-col relative">
            <div className="absolute top-6 left-6 z-50">
              <p className="text-base text-blue-800 font-bold bg-white/90 px-2 py-1 rounded">
                dodo cleaners
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-2 -mt-12">
                <Logo size="xl" showText={false} className="justify-center h-40" />
              </div>
              <div className="text-center px-4">
                <h1 className="text-lg font-bold text-center mb-2 text-gray-800">
                  Welcome!
                </h1>
                <p className="text-center text-gray-600 mb-4 text-sm">
                  Enter your information to receive your first stamp
                </p>
                <CustomerForm onSubmit={handleNewCustomerRegistration} initialPhone={prefilledPhone} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (completed && customer) {
    const isFirst = customer.stamps === 1
    
    if (showDetails) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex flex-col px-4 pt-2">
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white rounded-2xl shadow-xl px-6 pt-4 pb-6 text-center border border-orange-100">
              <Logo size="2xl" showText={false} className="justify-center mb-1" />
              
              <h1 className="text-lg font-bold mb-2 text-orange-600">
                Stamp Details
              </h1>
              
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {customer.stamps}
                  </div>
                  <div className="text-sm text-gray-600">Current Stamps</div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {customer.stamps}
                  </div>
                  <div className="text-sm text-gray-600">Total Earned</div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-600 mb-1">
                    0
                  </div>
                  <div className="text-sm text-gray-600">Used Stamps</div>
                </div>
              </div>

              <button
                onClick={closeBrowserOrRedirect}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 px-1 py-0">
        <div className="w-full max-w-sm mx-auto h-screen flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-0 text-center border border-orange-100 flex-1 flex flex-col relative">
            <div className="absolute top-6 left-6 z-50">
              <p className="text-base text-blue-800 font-bold bg-white/90 px-2 py-1 rounded">
                dodo cleaners
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-2 -mt-12">
                <Logo size="xl" showText={false} className="justify-center h-40" />
              </div>
              <div className="px-4 pb-4">
                {isFirst ? (
                <>
                  <Fireworks show={true} duration={5000} />
                  <div className="text-center mb-4 mt-8">
                    <h1 className="text-2xl font-bold mb-2 text-purple-600 animate-bounce">
                      🎊 Welcome! 🎊
                    </h1>
                    <h2 className="text-xl font-bold mb-4 text-green-600">
                      Registration Complete!
                    </h2>
                    <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-4 mb-3">
                      <p className="text-blue-700 font-bold text-lg mb-2">
                        🏆 First Stamp Earned! 🏆
                      </p>
                      <div className="flex items-center justify-center">
                        <span className="text-4xl font-bold text-purple-600">
                          <CountUp from={0} to={1} duration={2000} />
                        </span>
                      </div>
                      <p className="text-base text-green-600 mt-2 font-medium">
                        Thank you for joining us! 🌟
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold mb-4 text-green-600">
                    🎉 Stamp Added! 🎉
                  </h1>
                  <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-4xl font-bold text-green-600">
                        <CountUp from={customer.stamps - 1} to={customer.stamps} duration={1500} />
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 font-medium">
                      Keep collecting! 🌟
                    </p>
                  </div>
                </>
              )}

{showCoupons && availableCoupons.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <h3 className="text-lg font-bold text-green-700 mb-3 text-center">
                      🎟️ You have unused coupons!
                    </h3>
                    <div className="space-y-2">
                      {availableCoupons.map((coupon) => (
                        <div key={coupon.id} className="bg-white p-3 rounded-lg border border-green-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-green-700">
                                {coupon.value}% OFF Coupon
                              </div>
                              <div className="text-xs text-gray-600">
                                Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUseCoupon(coupon.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              USE NOW
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isFirst && (
                  <button
                    onClick={() => setShowDetails(true)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border border-orange-300 rounded-lg hover:from-orange-200 hover:to-yellow-200 font-medium mb-3 text-sm"
                  >
                    View Stamp Details
                  </button>
                )}

                <button
                  onClick={closeBrowserOrRedirect}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Force deployment trigger
