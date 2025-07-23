'use client'

import { useEffect, useState } from 'react'

interface CountUpProps {
  from: number
  to: number
  duration?: number
  className?: string
}

export default function CountUp({ from, to, duration = 1500, className = '' }: CountUpProps) {
  const [count, setCount] = useState(from)

  useEffect(() => {
    if (from === to) return

    const startTime = Date.now()
    const difference = to - from

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.round(from + difference * easeOutQuart)
      
      setCount(currentCount)
      
      if (progress >= 1) {
        clearInterval(timer)
        setCount(to)
      }
    }, 16) // ~60fps

    return () => clearInterval(timer)
  }, [from, to, duration])

  return (
    <span className={className}>
      {count}
    </span>
  )
}