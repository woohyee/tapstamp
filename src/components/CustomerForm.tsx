'use client'

import { useState } from 'react'
import { CustomerRegistration } from '@/types'
import FloatingInput from './FloatingInput'

interface CustomerFormProps {
  onSubmit: (customer: CustomerRegistration) => void
  initialPhone?: string
}

export default function CustomerForm({ onSubmit, initialPhone = '' }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: initialPhone,
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined
      })
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'phone') {
      const formatted = formatPhoneNumber(e.target.value)
      setFormData(prev => ({
        ...prev,
        phone: formatted
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [e.target.name]: e.target.value
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <FloatingInput
        id="name"
        name="name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        label="Name"
        placeholder="Enter your name"
        required
      />

      <FloatingInput
        id="phone"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        label="Phone Number"
        placeholder="111-111-1111"
        required
      />

      <FloatingInput
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        label="Email (Optional)"
        placeholder="example@email.com"
      />

      <button
        type="submit"
        disabled={isSubmitting || !formData.name || !formData.phone}
        className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-4 px-6 rounded-xl hover:from-orange-600 hover:to-yellow-600 disabled:from-orange-300 disabled:to-yellow-300 disabled:cursor-not-allowed font-bold shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-4 text-base mobile-button"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Registering...</span>
          </div>
        ) : (
          '🎯 Register & Get Stamp'
        )}
      </button>
    </form>
  )
}