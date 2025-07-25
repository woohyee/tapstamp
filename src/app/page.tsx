'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Customer, CustomerRegistration } from '@/types'
import CustomerForm from '@/components/CustomerForm'
import Logo from '@/components/Logo'
import Fireworks from '@/components/Fireworks'
import CountUp from '@/components/CountUp'
import { closeBrowserOrRedirect } from '@/utils/browserUtils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [stampProcessed, setStampProcessed] = useState(false)

  useEffect(() => {
    checkCustomerAndProcess()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkCustomerAndProcess = async () => {
    try {
      const customerId = localStorage.getItem('tagstamp_customer_id')
      
      if (!customerId) {
        // 신규 고객
        setIsNewCustomer(true)
        setLoading(false)
        return
      }

      // 기존 고객 - 정보 확인
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (error || !data) {
        // 잘못된 ID - 신규 고객으로 처리
        localStorage.removeItem('tagstamp_customer_id')
        setIsNewCustomer(true)
        setLoading(false)
        return
      }

      // 기존 고객 - 세션에서 이미 처리되었는지 확인
      const sessionKey = `stamp_processed_${customerId}_${Date.now().toString().slice(0, -5)}` // 5분 단위로 구분
      const alreadyProcessed = sessionStorage.getItem(sessionKey)
      
      if (alreadyProcessed) {
        // 이미 이번 세션에서 스탬프 처리됨 - 정보만 표시
        setCustomer(data)
        setCompleted(true)
        setStampProcessed(true)
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

  const addStampToExistingCustomer = async (customerData: Customer, sessionKey: string) => {
    try {
      const newStampCount = customerData.stamps + 1
      const shouldBecomeVip = newStampCount >= 30 && !customerData.vip_status

      // 스탬프 기록 추가
      await supabase
        .from('stamps')
        .insert([{
          customer_id: customerData.id,
          amount: 0 // 금액은 사용하지 않음
        }])

      // 고객 정보 업데이트
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          stamps: newStampCount,
          vip_status: shouldBecomeVip ? true : customerData.vip_status,
          vip_expires_at: shouldBecomeVip ? 
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : 
            customerData.vip_expires_at
        })
        .eq('id', customerData.id)
        .select()
        .single()

      if (updateError) throw updateError

      // 쿠폰 발급 체크
      await checkAndIssueCoupons(updatedCustomer)

      // 세션에 처리 완료 표시
      sessionStorage.setItem(sessionKey, 'true')

      setCustomer(updatedCustomer)
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
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          stamps: 1 // 첫 스탬프
        }])
        .select()
        .single()

      if (customerError) throw customerError

      // 첫 스탬프 기록
      await supabase
        .from('stamps')
        .insert([{
          customer_id: newCustomer.id,
          amount: 0
        }])

      // 로컬스토리지에 저장
      localStorage.setItem('tagstamp_customer_id', newCustomer.id)
      
      setCustomer(newCustomer)
      setIsNewCustomer(false)
      setCompleted(true)
    } catch {
      setError('Failed to register customer.')
    }
  }

  const checkAndIssueCoupons = async (customer: { id: string; stamps: number }) => {
    const stamps = customer.stamps
    
    if (stamps === 10) {
      await supabase
        .from('coupons')
        .insert([{
          customer_id: customer.id,
          type: 'discount_10',
          value: 10,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
    }
    
    if (stamps === 15) {
      await supabase
        .from('coupons')
        .insert([{
          customer_id: customer.id,
          type: 'discount_20',
          value: 20,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
    }
    
    if (stamps > 15 && stamps % 10 === 0) {
      await supabase
        .from('coupons')
        .insert([{
          customer_id: customer.id,
          type: 'discount_10',
          value: 10,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
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
                <CustomerForm onSubmit={handleNewCustomerRegistration} />
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
                  <Fireworks show={true} duration={4000} />
                  <div className="text-center mb-4 mt-8">
                    <h1 className="text-2xl font-bold mb-2 text-purple-600 animate-bounce">
                      🎊 Welcome! 🎊
                    </h1>
                    <h2 className="text-xl font-bold mb-1 text-green-600">
                      Registration Complete!
                    </h2>
                    <p className="text-gray-700 mb-2 text-base font-medium">
                      Welcome {customer.name}! ✨
                    </p>
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
              ) : stampProcessed ? (
                <>
                  <h1 className="text-lg font-bold mb-0 text-orange-600">
                    Welcome Back! 👋
                  </h1>
                  <p className="text-gray-600 mb-3 text-sm">
                    Hello {customer.name}!<br/>
                    Your current stamp count is shown below.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold mb-2 text-green-600">
                    🎉 Stamp Added! 🎉
                  </h1>
                  <p className="text-gray-700 mb-2 text-base font-medium">
                    Thank you for visiting again, {customer.name}! ✨
                  </p>
                  <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-3 mb-3">
                    <p className="text-green-700 font-bold text-base mb-1">
                      🏆 New Stamp Earned! 🏆
                    </p>
                    <div className="flex items-center justify-center">
                      <span className="text-3xl font-bold text-green-600">
                        <CountUp from={customer.stamps - 1} to={customer.stamps} duration={1500} />
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1 font-medium">
                      Keep collecting! 🌟
                    </p>
                  </div>
                </>
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
