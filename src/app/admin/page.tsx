'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types'
import { Search, Plus, User, Star, Settings } from 'lucide-react'
import Logo from '@/components/Logo'
import FloatingInput from '@/components/FloatingInput'
import { closeAdminSession } from '@/utils/browserUtils'

export default function AdminPage() {
  // 관리자 localStorage 체크 및 인증 처리
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        // localStorage에서 관리자 토큰 확인
        const adminToken = localStorage.getItem('tagstamp_admin_token')
        const adminExpiry = localStorage.getItem('tagstamp_admin_expiry')
        
        if (adminToken && adminExpiry) {
          const expiryTime = parseInt(adminExpiry)
          if (Date.now() < expiryTime) {
            // 유효한 토큰 - 바로 관리자 기능으로
            setIsAuthenticated(true)
            setAuthLoading(false)
            return
          } else {
            // 토큰 만료 - 삭제
            localStorage.removeItem('tagstamp_admin_token')
            localStorage.removeItem('tagstamp_admin_expiry')
          }
        }

        // 토큰이 없거나 만료됨 - 비밀번호 입력 요구
        setNeedsPassword(true)
        setAuthLoading(false)
        
      } catch (error) {
        console.error('Admin auth error:', error)
        setNeedsPassword(true)
        setAuthLoading(false)
      }
    }
    
    checkAdminSession()
  }, [])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<'dashboard' | 'search' | 'confirm' | 'complete' | 'edit' | 'customer-edit'>('dashboard')
  // const [showMenu, setShowMenu] = useState(false)
  const [editData, setEditData] = useState({ name: '', phone: '', email: '' })
  const [showStampHistory, setShowStampHistory] = useState(false)
  const [stampHistory, setStampHistory] = useState<Array<{id: string; created_at: string}>>([])
  // const [directStampCount, setDirectStampCount] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    if (numbers.length <= 10) return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const searchCustomer = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter phone number')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 전화번호에서 숫자만 추출하여 검색
      const cleanPhone = phoneNumber.replace(/\D/g, '')
      
      // 다양한 형태로 검색 시도
      const { data, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .or(`phone.eq.${phoneNumber},phone.eq.${cleanPhone}`)
        .maybeSingle()

      if (searchError) {
        throw searchError
      }

      if (!data) {
        setError('Phone number not found. Customer must register via NFC tag first.')
        setCustomer(null)
        setStep('search')
      } else {
        setCustomer(data)
        // 고객 관리에서 검색한 경우 바로 편집 페이지로
        if (step === 'customer-edit') {
          showCustomerInfo()
          setStep('edit')
        } else {
          setStep('confirm')
        }
      }
    } catch {
      setError('Error occurred while searching')
    } finally {
      setLoading(false)
    }
  }

  const addStamp = async () => {
    if (!customer) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const newStampCount = customer.stamps + 1
      const shouldBecomeVip = newStampCount >= 30 && !customer.vip_status

      // 스탬프 기록 추가
      await supabase
        .from('stamps')
        .insert([{
          customer_id: customer.id,
          amount: 0
        }])

      // 고객 정보 업데이트
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          stamps: newStampCount,
          vip_status: shouldBecomeVip ? true : customer.vip_status,
          vip_expires_at: shouldBecomeVip ? 
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : 
            customer.vip_expires_at
        })
        .eq('id', customer.id)
        .select()
        .single()

      if (updateError) throw updateError

      // 쿠폰 발급 체크
      await checkAndIssueCoupons(updatedCustomer)

      setCustomer(updatedCustomer)
      setStep('complete')
      
    } catch {
      setError('Error occurred while adding stamp')
    } finally {
      setLoading(false)
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


  // const startEdit = () => {
  //   if (customer) {
  //     setEditData({
  //       name: customer.name,
  //       phone: customer.phone,
  //       email: customer.email || ''
  //     })
  //     setStep('edit')
  //   }
  // }

  const showCustomerInfo = () => {
    if (customer) {
      setEditData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || ''
      })
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value)
      setEditData(prev => ({ ...prev, phone: formatted }))
    } else {
      setEditData(prev => ({ ...prev, [name]: value }))
    }
  }

  const saveCustomerEdit = async () => {
    if (!customer) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          name: editData.name,
          phone: editData.phone.replace(/\D/g, ''),
          email: editData.email || null
        })
        .eq('id', customer.id)
        .select()
        .single()

      if (updateError) throw updateError

      setCustomer(updatedCustomer)
      setSuccess('Customer information updated successfully')
      setStep('dashboard')
    } catch {
      setError('Failed to update customer information')
    } finally {
      setLoading(false)
    }
  }

  // const deleteCustomer = async () => {
  //   if (!customer) return
  //   
  //   if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
  //     return
  //   }
  //   
  //   setLoading(true)
  //   setError(null)
  //   
  //   try {
  //     // Delete related records first
  //     await supabase.from('stamps').delete().eq('customer_id', customer.id)
  //     await supabase.from('coupons').delete().eq('customer_id', customer.id)
  //     
  //     // Delete customer
  //     const { error: deleteError } = await supabase
  //       .from('customers')
  //       .delete()
  //       .eq('id', customer.id)

  //     if (deleteError) throw deleteError

  //     setSuccess('Customer deleted successfully')
  //     resetForm()
  //   } catch {
  //     setError('Failed to delete customer')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const getStampHistory = async () => {
    if (!customer) return
    
    try {
      const { data, error } = await supabase
        .from('stamps')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStampHistory(data || [])
      setShowStampHistory(true)
    } catch {
      setError('Failed to load stamp history')
    }
  }

  const deleteStamp = async (stampId: string) => {
    if (!customer || !confirm('Delete this stamp?')) return
    
    setLoading(true)
    try {
      await supabase.from('stamps').delete().eq('id', stampId)
      
      // Update customer stamp count
      const newStampCount = Math.max(0, customer.stamps - 1)
      await supabase
        .from('customers')
        .update({ stamps: newStampCount })
        .eq('id', customer.id)

      // Refresh data
      const { data: updatedCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single()

      setCustomer(updatedCustomer)
      await getStampHistory()
      setSuccess('Stamp deleted successfully')
    } catch {
      setError('Failed to delete stamp')
    } finally {
      setLoading(false)
    }
  }

  // const updateStampCount = async () => {
  //   if (!customer || !directStampCount) return
  //   
  //   const newCount = parseInt(directStampCount)
  //   if (isNaN(newCount) || newCount < 0) {
  //     setError('Please enter a valid number')
  //     return
  //   }

  //   setLoading(true)
  //   try {
  //     await supabase
  //       .from('customers')
  //       .update({ stamps: newCount })
  //       .eq('id', customer.id)

  //     const { data: updatedCustomer } = await supabase
  //       .from('customers')
  //       .select('*')
  //       .eq('id', customer.id)
  //       .single()

  //     setCustomer(updatedCustomer)
  //     setDirectStampCount('')
  //     setSuccess(`Stamp count updated to ${newCount}`)
  //   } catch {
  //     setError('Failed to update stamp count')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handlePasswordAuth = () => {
    // 간단한 비밀번호 검증 (실제로는 더 복잡한 검증 필요)
    const ADMIN_PASSWORD = '123' // 실제로는 환경변수나 DB에서 관리
    
    if (password === ADMIN_PASSWORD) {
      // 인증 성공 - 새 토큰 생성
      const adminToken = 'admin_' + Date.now()
      const expiryTime = Date.now() + (60 * 60 * 1000) // 1시간
      
      localStorage.setItem('tagstamp_admin_token', adminToken)
      localStorage.setItem('tagstamp_admin_expiry', expiryTime.toString())
      
      setIsAuthenticated(true)
      setNeedsPassword(false)
      setPassword('')
      setError(null)
    } else {
      setError('Invalid password')
    }
  }


  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // 관리자 비밀번호 인증 필요
  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-6 border border-blue-100">
            <div className="mb-4">
              <Logo size="xl" showText={false} className="justify-center mb-2" />
            </div>
            <h1 className="text-xl font-bold text-center mb-3 text-blue-600">
              Admin Authentication
            </h1>
            <p className="text-center text-gray-600 mb-6 text-sm">
              Enter admin password to continue
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordAuth()}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="Enter password"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handlePasswordAuth}
                disabled={!password.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              >
                Access Admin Panel
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Session expires after 1 hour
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 관리자 대시보드 메인
  if (isAuthenticated && step === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-sm mx-auto px-4 py-4">
          {/* 헤더 */}
          <div className="text-center mb-5">
            <div className="mb-3">
              <Logo size="xl" showText={false} className="justify-center mb-2" />
            </div>
            <h1 className="text-lg font-bold text-gray-800 mb-1">
              Admin Dashboard
            </h1>
          </div>

          {/* 메뉴 카드들 */}
          <div className="space-y-4">
            <div 
              onClick={() => {
                setPhoneNumber('')
                setError(null)
                setSuccess(null)
                setStep('search')
              }}
              className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">Add Stamps</h3>
                  <p className="text-gray-600 text-sm">Search and add customer stamps</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => {
                setPhoneNumber('')
                setError(null)
                setSuccess(null)
                setStep('customer-edit')
              }}
              className="bg-white rounded-xl shadow-lg p-6 border border-green-100 hover:shadow-2xl hover:border-green-200 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Settings className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">Customer Management</h3>
                  <p className="text-gray-600 text-sm">Edit customer info and stamps</p>
                </div>
              </div>
            </div>

          </div>

          {/* DONE 버튼 */}
          <div className="mt-8">
            <button
              onClick={closeAdminSession}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-medium"
            >
              DONE
            </button>
          </div>

          {/* 하단 정보 */}
          <div className="mt-4 text-center">
            <p className="text-gray-500 text-xs">
              Session expires in 1 hour
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 스탬프 적립 - 검색 단계
  if (isAuthenticated && step === 'search') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-6 border border-blue-100">
            <div className="mb-4">
              <Logo size="xl" showText={false} className="justify-center mb-2" />
            </div>
            <h1 className="text-lg font-bold text-center mb-1 text-gray-800">
              Add Stamps
            </h1>
            <p className="text-center text-gray-600 mb-4 text-sm">
              Search customer by phone number
            </p>

            <div className="space-y-5">
              <FloatingInput
                id="search-phone"
                name="phone"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                label="Customer Phone Number"
                placeholder="111-111-1111"
                onKeyPress={(e) => e.key === 'Enter' && searchCustomer()}
                disabled={loading}
              />

              <button
                onClick={searchCustomer}
                disabled={loading || !phoneNumber.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2 font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search Customer
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 확인 단계
  if (isAuthenticated && step === 'confirm' && customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col px-4 pt-2">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
            <Logo size="2xl" showText={false} className="justify-center mb-3" />
            <h1 className="text-lg font-bold text-center mb-3 text-gray-800">
              Customer Found
            </h1>

            <div className="bg-gray-50 border rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-6 h-6 text-gray-600" />
                  <span className="text-xl font-medium text-gray-800">{customer.name}</span>
                </div>
                {customer.vip_status && (
                  <div className="flex items-center text-yellow-600">
                    <Star className="w-5 h-5 mr-1" />
                    <span className="text-sm font-medium">VIP</span>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                Phone: {customer.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {customer.stamps}
                </div>
                <div className="text-sm text-gray-600">Current stamps</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={addStamp}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2 font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding Stamp...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add 1 Stamp
                  </>
                )}
              </button>


              <button
                onClick={() => setStep('dashboard')}
                className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Back to Dashboard
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 고객 관리 - 검색 단계
  if (isAuthenticated && step === 'customer-edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col px-4 pt-2">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
            <Logo size="2xl" showText={false} className="justify-center mb-3" />
            <h1 className="text-lg font-bold text-center mb-1 text-gray-800">
              Customer Management
            </h1>
            <p className="text-center text-gray-600 mb-4 text-sm">
              Search customer to edit information
            </p>

            <div className="space-y-5">
              <FloatingInput
                id="customer-search-phone"
                name="phone"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                label="Customer Phone Number"
                placeholder="111-111-1111"
                onKeyPress={(e) => e.key === 'Enter' && searchCustomer()}
                disabled={loading}
              />

              <button
                onClick={async () => {
                  await searchCustomer()
                  // searchCustomer 완료 후 고객이 있으면 편집 페이지로
                }}
                disabled={loading || !phoneNumber.trim()}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search Customer
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 편집 단계
  if (isAuthenticated && step === 'edit' && customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col px-4 py-6">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-5">
            {/* 헤더 */}
            <Logo size="sm" className="justify-center mb-4" />
            <h1 className="text-base font-bold text-center mb-2 text-gray-800">
              Edit Customer
            </h1>

            {/* 고객 정보 편집 폼 */}
            <div className="space-y-3 mb-4">
              <FloatingInput
                id="edit-name"
                name="name"
                type="text"
                value={editData.name}
                onChange={handleEditChange}
                label="Name"
                placeholder="Enter customer name"
                required
              />

              <FloatingInput
                id="edit-phone"
                name="phone"
                type="tel"
                value={editData.phone}
                onChange={handleEditChange}
                label="Phone Number"
                placeholder="111-111-1111"
                required
              />

              <FloatingInput
                id="edit-email"
                name="email"
                type="email"
                value={editData.email}
                onChange={handleEditChange}
                label="Email (Optional)"
                placeholder="example@email.com"
              />
            </div>

            {/* 스탬프 관리 섹션 */}
            <div className="border-t pt-3 mb-4">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Stamps</h3>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="text-center mb-2">
                  <div className="text-xl font-bold text-yellow-600">{customer.stamps}</div>
                  <div className="text-xs text-gray-600">Current Stamps</div>
                  {customer.vip_status && (
                    <div className="mt-1 px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium inline-block">
                      ⭐ VIP
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    if (showStampHistory) {
                      setShowStampHistory(false)
                    } else {
                      getStampHistory()
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  {showStampHistory ? 'Hide' : 'View'} History
                </button>
              </div>

              {showStampHistory && (
                <div className="bg-white border rounded-lg p-3 max-h-40 overflow-y-auto mb-3">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm">History ({stampHistory.length})</h4>
                  {stampHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">No stamps found</p>
                  ) : (
                    <div className="space-y-1">
                      {stampHistory.slice(0, 10).map((stamp, index) => (
                        <div key={stamp.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-b-0">
                          <div>
                            <div className="text-xs font-medium">#{stampHistory.length - index}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(stamp.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteStamp(stamp.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 disabled:bg-gray-100"
                          >
                            Del
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 버튼들 */}
            <div className="space-y-2">
              <button
                onClick={async () => {
                  if (!confirm('Save changes to customer information?')) return
                  await saveCustomerEdit()
                }}
                disabled={loading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button
                onClick={() => setStep('dashboard')}
                className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Done
              </button>
            </div>

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 완료 단계
  if (isAuthenticated && step === 'complete' && customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-green-100">
            <Logo size="2xl" showText={false} className="justify-center mb-3" />
            
            <h1 className="text-lg font-bold mb-3 text-green-600">
              Stamp Added Successfully! ✅
            </h1>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <div className="text-lg font-medium text-gray-800 mb-2">
                {customer.name}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {customer.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">
                  {customer.stamps}
                </div>
                <div className="text-sm text-gray-600 mb-2">Total stamps</div>
                
                <div className="text-sm text-yellow-700 font-medium">
                  +1 stamp added
                </div>
                
                {customer.vip_status && (
                  <div className="mt-3 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-medium inline-block">
                    ⭐ VIP Member
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-6">
              {customer.stamps >= 10 ? 
                `Next 10 stamps for additional discount!` : 
                `${10 - customer.stamps} more stamps for 10% discount!`
              }
            </div>

            <button
              onClick={() => setStep('dashboard')}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}