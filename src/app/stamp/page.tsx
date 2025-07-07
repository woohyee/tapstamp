'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Customer, CustomerRegistration } from '@/types'
import CustomerForm from '@/components/CustomerForm'
import Logo from '@/components/Logo'

export default function StampPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

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

      // 기존 고객 - 즉시 스탬프 적립
      await addStampToExistingCustomer(data)
    } catch {
      setError('System error occurred.')
      setLoading(false)
    }
  }

  const addStampToExistingCustomer = async (customerData: Customer) => {
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

  // const getCustomerStats = async (customerId: string) => {
  //   try {
  //     const { data: allStamps } = await supabase
  //       .from('stamps')
  //       .select('*')
  //       .eq('customer_id', customerId)
  //       .order('created_at', { ascending: false })

  //     const { data: usedCoupons } = await supabase
  //       .from('coupons')
  //       .select('*')
  //       .eq('customer_id', customerId)
  //       .eq('used', true)

  //     return {
  //       totalStamps: allStamps?.length || 0,
  //       usedStamps: usedCoupons?.length || 0,
  //       currentStamps: customer?.stamps || 0
  //     }
  //   } catch {
  //     return {
  //       totalStamps: customer?.stamps || 0,
  //       usedStamps: 0,
  //       currentStamps: customer?.stamps || 0
  //     }
  //   }
  // }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Logo size="lg" className="justify-center mb-6" />
            <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">
              Welcome!
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Enter your information to receive your first stamp
            </p>
            <CustomerForm onSubmit={handleNewCustomerRegistration} />
          </div>
        </div>
      </div>
    )
  }

  if (completed && customer) {
    const isFirst = customer.stamps === 1
    
    if (showDetails) {
      return (
        <div className="min-h-screen bg-yellow-50 flex items-center justify-center px-4">
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <Logo size="md" className="justify-center mb-4" />
              
              <h1 className="text-xl font-bold mb-4 text-yellow-600">
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
                onClick={() => setShowDetails(false)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <Logo size="md" className="justify-center mb-4" />
            
            {isFirst ? (
              <>
                <h1 className="text-xl font-bold mb-3 text-yellow-600">
                  Registration Complete! 🎉
                </h1>
                <p className="text-gray-600 mb-4 text-sm">
                  Welcome {customer.name}!<br/>
                  Your first stamp has been added.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold mb-3 text-yellow-600">
                  Stamp Added! ⭐
                </h1>
                <p className="text-gray-600 mb-4 text-sm">
                  Thank you for visiting again, {customer.name}!<br/>
                  Your stamp has been added.
                </p>
              </>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {customer.stamps}
              </div>
              <div className="text-sm text-gray-600">Current stamps</div>
              
              {customer.vip_status && (
                <div className="mt-3 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                  ⭐ VIP Member
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 mb-4">
              {customer.stamps >= 10 ? 
                `Next 10 stamps for additional discount coupon!` : 
                `${10 - customer.stamps} more stamps for 10% discount coupon!`
              }
            </div>

            {!isFirst && (
              <button
                onClick={() => setShowDetails(true)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium mb-3 text-sm"
              >
                View Stamp Details
              </button>
            )}

            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}