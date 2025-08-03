'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StatsData {
  totalCustomers: number
  totalStamps: number
  totalCouponsIssued: number
  totalCouponsUsed: number
  
  dailyStamps: Array<{
    date: string
    count: number
  }>
  
  weeklyStamps: Array<{
    week: string
    count: number
  }>
  
  monthlyStamps: Array<{
    month: string
    count: number
  }>
  
  eventStats: {
    lottery: number
  }
  
  couponStats: Array<{
    type: string
    name: string
    issued: number
    used: number
    usageRate: number
  }>
  
  customerLevels: {
    newbies: number
    regular: number
    loyal: number
    vip: number
  }
}

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'stamps' | 'coupons' | 'customers'>('overview')

  useEffect(() => {
    // Check admin authentication
    const token = localStorage.getItem('tagstamp_admin_token')
    const expiry = localStorage.getItem('tagstamp_admin_expiry')
    
    if (!token || !expiry || new Date().getTime() > parseInt(expiry)) {
      router.push('/admin')
      return
    }

    fetchStats()
  }, [router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      } else {
        setError('Failed to load statistics')
      }
    } catch (error) {
      console.error('Stats fetch error:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600 mb-4">{error || 'No data available'}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const SimpleChart = ({ data, title, color = 'blue' }: { data: Array<{date?: string, week?: string, month?: string, count: number}>, title: string, color?: string }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1)
    
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-2">
          {data.slice(-10).map((item, index) => {
            const label = item.date || item.week || item.month || ''
            const percentage = (item.count / maxCount) * 100
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-600 flex-shrink-0">
                  {label}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div 
                    className={`bg-${color}-500 h-4 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-8 text-xs text-gray-700 text-right">
                  {item.count}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-blue-600">📊 Statistics & Reports</h1>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-lg">
          {[
            { id: 'overview', label: '📋 Overview', emoji: '📋' },
            { id: 'stamps', label: '🎯 Stamps', emoji: '🎯' },
            { id: 'coupons', label: '🎫 Coupons', emoji: '🎫' },
            { id: 'customers', label: '👥 Customers', emoji: '👥' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalCustomers}</div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-2xl font-bold text-green-600">{stats.totalStamps}</div>
                <div className="text-sm text-gray-600">Total Stamps</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl mb-2">🎫</div>
                <div className="text-2xl font-bold text-orange-600">{stats.totalCouponsIssued}</div>
                <div className="text-sm text-gray-600">Coupons Issued</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalCouponsUsed}</div>
                <div className="text-sm text-gray-600">Coupons Used</div>
              </div>
            </div>

            {/* Event Participation */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🎮 Event Participation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="text-xl font-bold text-yellow-600">{stats.eventStats.lottery}</div>
                  <div className="text-sm text-gray-600">5-Stamp Lottery</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">🎁</div>
                  <div className="text-xl font-bold text-gray-600">Coming Soon</div>
                  <div className="text-sm text-gray-600">10-Stamp Bonus</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-xl font-bold text-gray-600">Coming Soon</div>
                  <div className="text-sm text-gray-600">20-Stamp VIP</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stamps Tab */}
        {activeTab === 'stamps' && (
          <div className="space-y-6">
            <SimpleChart data={stats.dailyStamps} title="📅 Daily Stamps (Last 30 Days)" color="green" />
            <SimpleChart data={stats.weeklyStamps} title="📊 Weekly Stamps (Last 12 Weeks)" color="blue" />
            <SimpleChart data={stats.monthlyStamps} title="📈 Monthly Stamps (Last 12 Months)" color="purple" />
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* Coupon Usage Rate */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🎫 Coupon Performance</h3>
              <div className="space-y-4">
                {stats.couponStats.map((coupon, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-gray-800">{coupon.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        coupon.usageRate >= 80 ? 'bg-green-500 text-white' :
                        coupon.usageRate >= 60 ? 'bg-yellow-500 text-white' :
                        coupon.usageRate >= 40 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {coupon.usageRate}% Usage
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Issued: </span>
                        <span className="font-bold text-blue-600">{coupon.issued}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Used: </span>
                        <span className="font-bold text-green-600">{coupon.used}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Remaining: </span>
                        <span className="font-bold text-orange-600">{coupon.issued - coupon.used}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Customer Levels */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">👥 Customer Levels</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">🌱</div>
                  <div className="text-xl font-bold text-green-600">{stats.customerLevels.newbies}</div>
                  <div className="text-sm text-gray-600">Newbies (1-4 stamps)</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">⭐</div>
                  <div className="text-xl font-bold text-blue-600">{stats.customerLevels.regular}</div>
                  <div className="text-sm text-gray-600">Regular (5-9 stamps)</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">💎</div>
                  <div className="text-xl font-bold text-purple-600">{stats.customerLevels.loyal}</div>
                  <div className="text-sm text-gray-600">Loyal (10-19 stamps)</div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mb-2">👑</div>
                  <div className="text-xl font-bold text-yellow-600">{stats.customerLevels.vip}</div>
                  <div className="text-sm text-gray-600">VIP (20+ stamps)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}