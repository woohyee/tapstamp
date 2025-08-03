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

  useEffect(() => {
    // 관리자 모드 체크 (쿼리 파라미터)
    const urlParams = new URLSearchParams(window.location.search)
    const isAdmin = urlParams.get('admin') === 'true'
    
    if (isAdmin) {
      console.log('🔧 Admin mode detected, redirecting...')
      window.location.href = '/admin'
      return
    }
    
    // 카트리지 초기화
    const fiveStampLottery = new FiveStampLotteryCartridge()
    cartridgeRegistry.register('5StampLottery', fiveStampLottery)
    console.log('카트리지 등록 완료:', cartridgeRegistry.getRegisteredCartridges())
    
    checkCustomerAndProcess()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkCustomerAndProcess = async () => {
    try {
      // URL 파라미터 체크
      const urlParams = new URLSearchParams(window.location.search)
      const skipCouponCheck = urlParams.get('skip_coupon_check') === 'true'
      
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

      // 기존 고객 - 세션에서 이미 처리되었는지 확인 (테스트용으로 10초 간격)
      const now = new Date()
      const timeKey = Math.floor(now.getTime() / (10 * 1000)) // 10초 단위
      const sessionKey = `stamp_processed_${customerId}_${timeKey}` 
      const alreadyProcessed = sessionStorage.getItem(sessionKey)
      
      // 테스트용으로 중복 방지 임시 비활성화
      if (false && alreadyProcessed) {
        console.log('🚫 Already processed, showing previous result only')
        // 이미 이번 세션에서 스탬프 처리됨 - 정보만 표시
        setCustomer(data)
        setCompleted(true)
        setLoading(false)
        return
      }
      
      console.log('✅ Not processed yet, proceeding with stamp addition')

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
      console.log('🎯 ALWAYS adding stamp first, then checking for unused coupons...')
      
      // 🔥 핵심: 항상 먼저 스탬프를 추가한다!
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

      // 업데이트된 고객 정보 설정
      setCustomer(data.customer)
      
      // API에서 이벤트 처리 결과 확인 (5개 스탬프 복권 이벤트)
      if (data.eventTriggered && data.eventTriggered.redirect) {
        console.log('🎉 Event triggered, redirecting to:', data.eventTriggered.redirect)
        window.location.href = data.eventTriggered.redirect
        return
      }
      
      // 🎫 스탬프 추가 후에 미사용 쿠폰 확인하여 별도 페이지로 리다이렉트 (skip_coupon_check가 아닌 경우에만)
      if (!skipCouponCheck) {
        console.log('🔍 Checking for unused coupons after stamp addition...')
        const hasUnusedCoupons = await checkAvailableCoupons(data.customer.id)
        
        if (hasUnusedCoupons) {
          console.log('🎫 Found unused coupons! Redirecting to alert page.')
          // 별도 쿠폰 알림 페이지로 리다이렉트
          window.location.href = `/alert-coupon?customer_id=${data.customer.id}&stamps=${data.customer.stamps}`
          return
        }
      } else {
        console.log('⏭️ Skipping coupon check as requested')
      }
      
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
      
      // 신규 고객은 이미 첫 스탬프가 포함되어 등록됨
      setCustomer(newCustomer)
      
      // Check for existing unused coupons (though unlikely for new customers)
      await checkAvailableCoupons(newCustomer.id)
      
      setIsNewCustomer(false)
      setCompleted(true)
    } catch {
      setError('Failed to register customer.')
    }
  }

  const checkAvailableCoupons = async (customerId: string): Promise<boolean> => {
    try {
      console.log('🎫 [CLIENT] Checking unused coupons for customer:', customerId)
      
      const response = await fetch(`/api/coupons/check?customer_id=${customerId}`)
      console.log('📡 [CLIENT] API response status:', response.status)
      
      if (!response.ok) {
        console.error('🚨 [CLIENT] API call failed:', response.status, response.statusText)
        return false
      }
      
      const data = await response.json()
      console.log('📊 [CLIENT] API response data:', data)
      
      if (data.success && data.hasUnusedCoupons && data.coupons.length > 0) {
        console.log('🎯 [CLIENT] Found unused coupons! Count:', data.coupons.length)
        return true
      } else {
        console.log('❌ [CLIENT] No unused coupons found or API failed')
        return false
      }
    } catch (error) {
      console.error('🚨 [CLIENT] Error checking coupons:', error)
      return false
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl animate-pulse">🎯</div>
            </div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Processing your stamp...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border border-red-100">
            <div className="text-6xl mb-4 animate-bounce">❌</div>
            <div className="text-red-600 text-xl font-bold mb-2">Oops!</div>
            <p className="text-gray-600 mb-6 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 font-medium shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              🔄 Try Again
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
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-4 px-6 rounded-xl hover:from-orange-600 hover:to-yellow-600 font-semibold shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base"
                  >
                    📱 Continue
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
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 font-semibold shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base"
              >
                ✅ Done
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


                {!isFirst && (
                  <button
                    onClick={() => setShowDetails(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-2 border-orange-300 rounded-xl hover:from-orange-200 hover:to-yellow-200 font-medium mb-3 text-base transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    📊 View Stamp Details
                  </button>
                )}

                <button
                  onClick={closeBrowserOrRedirect}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 font-semibold shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base pulse-animation"
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

  return null
}

// Force deployment trigger
// Force new deployment
