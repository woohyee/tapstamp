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
    console.log('🚀 NFC Customer Entry Point - Production Mode')
    
    // 🚨 CRITICAL: 접속 방법 검증 - NFC/QR/수동 접속만 허용
    const urlParams = new URLSearchParams(window.location.search)
    const accessMethod = urlParams.get('method')
    
    if (!accessMethod || !['nfc', 'qr', 'manual'].includes(accessMethod)) {
      console.log('❌ Invalid access - Valid access method required')
      setError('Access denied. Please use NFC card or QR code.')
      setLoading(false)
      return
    }
    
    console.log('✅ Valid access method detected:', accessMethod)
    checkCustomerAndProcess()
  }, [])

  const checkCustomerAndProcess = async () => {
    try {
      console.log('🔍 Checking localStorage for existing customer...')
      const customerId = localStorage.getItem('tagstamp_customer_id')
      
      if (!customerId) {
        console.log('❌ No customer ID in localStorage - showing phone input')
        setNeedPhoneNumber(true)
        setLoading(false)
        return
      }

      console.log('✅ Customer ID found:', customerId)
      // Verify customer exists in database
      const customerDoc = await getDoc(doc(db, 'customers', customerId))

      if (!customerDoc.exists()) {
        console.log('❌ Customer not found in database, clearing localStorage')
        localStorage.removeItem('tagstamp_customer_id')
        setNeedPhoneNumber(true)
        setLoading(false)
        return
      }

      const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer
      console.log('🎯 Existing customer found:', customerData.name, 'Stamps:', customerData.stamps)

      // Process stamp addition for existing customer
      await processStampAddition(customerData)
    } catch (error) {
      console.error('🚨 Error in checkCustomerAndProcess:', error)
      setError('Connection failed. Please try again.')
      setLoading(false)
    }
  }

  const handlePhoneNumberCheck = async (phone: string) => {
    try {
      setLoading(true)
      console.log('📞 Checking phone number:', phone)
      
      // Search for existing customer by phone
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
        
        console.log('✅ Existing customer found by phone:', existingCustomer.name)
        // Restore localStorage and process stamp
        localStorage.setItem('tagstamp_customer_id', existingCustomer.id)
        await processStampAddition(existingCustomer)
        setNeedPhoneNumber(false)
      } else {
        console.log('👤 New customer - showing registration form')
        setPrefilledPhone(phone)
        setIsNewCustomer(true)
        setNeedPhoneNumber(false)
        setLoading(false)
      }
    } catch (error) {
      console.error('🚨 Phone check error:', error)
      setError('Failed to verify phone number.')
      setLoading(false)
    }
  }

  const processStampAddition = async (customerData: Customer) => {
    try {
      console.log('⭐ Processing stamp addition for:', customerData.name)
      
      // Call stamp API
      const response = await fetch('/api/stamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerData.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Stamp addition failed')
      }

      const data = await response.json()
      console.log('✅ Stamp added successfully. New count:', data.customer.stamps)
      
      setCustomer(data.customer)
      
      // Check for 5-stamp lottery event
      if (data.eventTriggered && data.eventTriggered.redirect) {
        console.log('🎉 Event triggered! Redirecting to:', data.eventTriggered.redirect)
        window.location.href = data.eventTriggered.redirect
        return
      }
      
      // Check for unused coupons
      const hasUnusedCoupons = await checkForUnusedCoupons(data.customer.id)
      if (hasUnusedCoupons) {
        console.log('🎫 Unused coupons found! Redirecting to coupon alert')
        window.location.href = `/alert-coupon?customer_id=${data.customer.id}&stamps=${data.customer.stamps}`
        return
      }
      
      // Show success screen
      setCompleted(true)
      setLoading(false)
    } catch (error) {
      console.error('🚨 Stamp processing error:', error)
      setError('Failed to add stamp. Please try again.')
      setLoading(false)
    }
  }

  const handleNewCustomerRegistration = async (customerData: CustomerRegistration) => {
    try {
      console.log('👤 Registering new customer:', customerData.name)
      
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }
      
      const { customer: newCustomer } = await response.json()
      console.log('🎉 New customer registered with first stamp!')

      // Save to localStorage
      localStorage.setItem('tagstamp_customer_id', newCustomer.id)
      setCustomer(newCustomer)
      
      // Check for unused coupons (unlikely for new customer but keep consistent)
      await checkForUnusedCoupons(newCustomer.id)
      
      setIsNewCustomer(false)
      setCompleted(true)
    } catch (error) {
      console.error('🚨 Registration error:', error)
      setError('Registration failed. Please try again.')
    }
  }

  const checkForUnusedCoupons = async (customerId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/coupons/check?customer_id=${customerId}`)
      
      if (!response.ok) {
        return false
      }
      
      const data = await response.json()
      return data.success && data.hasUnusedCoupons && data.coupons.length > 0
    } catch (error) {
      console.error('Coupon check error:', error)
      return false
    }
  }

  // Loading Screen
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

  // Error Screen
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border border-red-100">
            <div className="text-6xl mb-4 animate-bounce">❌</div>
            <div className="text-red-600 text-xl font-bold mb-2">Connection Error</div>
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

  // Phone Number Input Screen
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

  // New Customer Registration Screen
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

  // Success Screen
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