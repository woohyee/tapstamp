'use client'

import { useEffect, useState } from 'react'

interface FireworksProps {
  show: boolean
  duration?: number
}

export default function Fireworks({ show, duration = 3000 }: FireworksProps) {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    color: string
    size: number
    vx: number
    vy: number
    life: number
    maxLife: number
  }>>([])

  useEffect(() => {
    if (!show) return

    let animationFrame: number
    let particleId = 0

    const colors = ['#FFD700', '#FF6B35', '#F7931E', '#FFE66D', '#FF9F1C', '#E71D36', '#2EC4B6']
    
    const createParticle = (x: number, y: number) => {
      const count = 15 + Math.random() * 10
      const newParticles = []
      
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const speed = 2 + Math.random() * 4
        const life = 60 + Math.random() * 40
        
        newParticles.push({
          id: particleId++,
          x,
          y,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 4,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life
        })
      }
      return newParticles
    }

    const updateParticles = () => {
      setParticles(prev => {
        const updated = prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.1, // gravity
          vx: particle.vx * 0.99, // air resistance
          life: particle.life - 1
        })).filter(particle => particle.life > 0)

        return updated
      })
    }

    // 초기 폭죽 생성
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400
    const fireworkPositions = [
      { x: screenWidth * 0.3, y: 100 },
      { x: screenWidth * 0.7, y: 120 },
      { x: screenWidth * 0.5, y: 80 }
    ]

    let fireworkIndex = 0
    const createFirework = () => {
      if (fireworkIndex < fireworkPositions.length) {
        const pos = fireworkPositions[fireworkIndex]
        const newParticles = createParticle(pos.x, pos.y)
        setParticles(prev => [...prev, ...newParticles])
        fireworkIndex++
      }
    }

    // 순차적으로 폭죽 생성
    createFirework()
    const fireworkInterval = setInterval(() => {
      createFirework()
    }, 400)

    // 파티클 애니메이션
    const animate = () => {
      updateParticles()
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    // 정리
    const cleanup = setTimeout(() => {
      clearInterval(fireworkInterval)
      cancelAnimationFrame(animationFrame)
      setParticles([])
    }, duration)

    return () => {
      clearInterval(fireworkInterval)
      clearTimeout(cleanup)
      cancelAnimationFrame(animationFrame)
      setParticles([])
    }
  }, [show, duration])

  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.life / particle.maxLife,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  )
}