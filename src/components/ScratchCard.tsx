'use client'

import { useRef, useEffect, useState } from 'react'

interface ScratchCardProps {
  result: {
    type: string
    name: string
    message: string
    bgColor: string
    emoji: string
    funEmoji?: string
  }
  onComplete: () => void
}

export default function ScratchCard({ result, onComplete }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScratching, setIsScratching] = useState(false)
  const [scratchPercentage, setScratchPercentage] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 300
    canvas.height = 200

    // Draw silver foil background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#E5E7EB')
    gradient.addColorStop(0.25, '#F9FAFB')
    gradient.addColorStop(0.5, '#D1D5DB')
    gradient.addColorStop(0.75, '#F3F4F6')
    gradient.addColorStop(1, '#E5E7EB')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add scratchy texture
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const opacity = Math.random() * 0.3
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
      ctx.fillRect(x, y, 1, 1)
    }

    // Add "SCRATCH HERE" text
    ctx.fillStyle = '#6B7280'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 - 10)
    
    ctx.font = '16px Arial'
    ctx.fillText('🪙 Use mouse or finger to scratch', canvas.width / 2, canvas.height / 2 + 20)

  }, [])

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = (x - rect.left) * scaleX
    const canvasY = (y - rect.top) * scaleY

    // Scratch effect - make transparent with softer brush
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    
    // Create gradient for softer edges
    const gradient = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, 15)
    gradient.addColorStop(0, 'rgba(0,0,0,1)')
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.8)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    
    ctx.fillStyle = gradient
    ctx.arc(canvasX, canvasY, 15, 0, 2 * Math.PI)
    ctx.fill()

    // Calculate scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparentPixels = 0

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentPixels++
    }

    const percentage = (transparentPixels / (pixels.length / 4)) * 100
    setScratchPercentage(percentage)

    // Auto-reveal when 30% scratched
    if (percentage > 30 && !isRevealed) {
      setIsRevealed(true)
      setTimeout(() => {
        const canvas = canvasRef.current
        if (canvas) {
          canvas.style.opacity = '0'
        }
        onComplete()
      }, 500)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true)
    scratch(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      scratch(e.clientX, e.clientY)
    }
  }

  const handleMouseUp = () => {
    setIsScratching(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsScratching(true)
    const touch = e.touches[0]
    scratch(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (isScratching) {
      const touch = e.touches[0]
      scratch(touch.clientX, touch.clientY)
    }
  }

  const handleTouchEnd = () => {
    setIsScratching(false)
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Prize content behind the scratch layer */}
      <div className={`
        w-full h-48 rounded-xl p-6 text-white text-center flex flex-col justify-center items-center
        ${result.bgColor} shadow-xl border-4 border-white
      `}>
        <div className="text-4xl mb-3">
          {result.type === 'empty' ? result.funEmoji : result.emoji}
        </div>
        <div className="text-2xl font-bold mb-2">
          {result.name}
        </div>
        <div className="text-sm opacity-90">
          {result.message}
        </div>
        {result.type !== 'empty' && (
          <div className="mt-2 text-xs bg-white/20 px-3 py-1 rounded-full">
            Valid for 30 days
          </div>
        )}
      </div>

      {/* Scratch canvas overlay */}
      <canvas
        ref={canvasRef}
        className={`
          absolute top-0 left-0 w-full h-full rounded-xl cursor-pointer
          transition-opacity duration-500
          ${isRevealed ? 'opacity-0' : 'opacity-100'}
        `}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />

      {/* Scratch progress indicator */}
      {scratchPercentage > 0 && scratchPercentage < 30 && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600 mb-2">
            Keep scratching... {Math.round(scratchPercentage)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(scratchPercentage, 30)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}