'use client'

import { useState } from 'react'

interface FloatingInputProps {
  id: string
  name: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  autoFocus?: boolean
}

export default function FloatingInput({ 
  id, 
  name, 
  type, 
  value, 
  onChange, 
  label, 
  placeholder, 
  required = false, 
  disabled = false,
  onKeyPress,
  autoFocus = false
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = value.length > 0
  const isFloating = isFocused || hasValue

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyPress={onKeyPress}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        placeholder={isFocused ? placeholder : ''}
        className={`
          w-full px-4 py-3.5 border-2 rounded-xl bg-white
          transition-all duration-200 ease-in-out
          text-base text-gray-900 mobile-input mobile-focus
          ${isFocused 
            ? 'border-orange-500 outline-none ring-4 ring-orange-100 transform scale-[1.02]' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          shadow-sm hover:shadow-md focus:shadow-lg
        `}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-4 transition-all duration-200 ease-in-out
          pointer-events-none select-none
          ${isFloating 
            ? '-top-3 text-sm bg-white px-2 text-orange-600 font-bold rounded-md shadow-sm' 
            : 'top-3.5 text-base text-gray-500'
          }
        `}
      >
        {label}
        {required && <span className="text-orange-500 ml-1">*</span>}
      </label>
    </div>
  )
}