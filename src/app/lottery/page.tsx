'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

interface LotteryCard {
  id: number
  type: 'empty' | 'discount_5' | 'discount_10' | 'discount_15' | 'discount_20'
  name: string
  value: number | null
  flipped: boolean
}

const CARD_DESIGNS = [
  { type: 'empty', name: 'OOPS!', bgColor: 'bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400', textColor: 'text-white', emoji: '🤡', sadEmoji: '😭', funnyEmoji: '🎪' },
  { type: 'discount_5', name: '5% OFF', bgColor: 'bg-green-500', textColor: 'text-white', emoji: '🎉' },
  { type: 'discount_10', name: '10% OFF', bgColor: 'bg-blue-500', textColor: 'text-white', emoji: '🎊' },
  { type: 'discount_15', name: '15% OFF', bgColor: 'bg-purple-500', textColor: 'text-white', emoji: '⭐' },
  { type: 'discount_20', name: '20% OFF', bgColor: 'bg-red-500', textColor: 'text-white', emoji: '🎯' }
]

export default function LotteryPage() {
  const router = useRouter()
  const [cards, setCards] = useState<LotteryCard[]>([])
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [shuffling, setShuffling] = useState(false)
  const [shuffleCards, setShuffleCards] = useState<LotteryCard[]>([])

  useEffect(() => {
    // 고객 ID 확인
    const storedCustomerId = localStorage.getItem('tagstamp_customer_id')
    if (!storedCustomerId) {
      router.push('/')
      return
    }
    setCustomerId(storedCustomerId)

    // 4장의 카드 초기화
    const initialCards: LotteryCard[] = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      type: 'empty',
      name: '?',
      value: null,
      flipped: false
    }))
    setCards(initialCards)

    // Generate 100 shuffle cards based on actual probability
    const generateShuffleCards = () => {
      const shuffleCardList: LotteryCard[] = []
      
      // Create cards based on probability distribution
      // Empty: 30%, 5% OFF: 35%, 10% OFF: 20%, 15% OFF: 10%, 20% OFF: 5%
      const cardDistribution = [
        { design: CARD_DESIGNS[0], count: 30 }, // OOPS! - 30%
        { design: CARD_DESIGNS[1], count: 35 }, // 5% OFF - 35%
        { design: CARD_DESIGNS[2], count: 20 }, // 10% OFF - 20%
        { design: CARD_DESIGNS[3], count: 10 }, // 15% OFF - 10%
        { design: CARD_DESIGNS[4], count: 5 }   // 20% OFF - 5%
      ]
      
      let cardId = 0
      for (const { design, count } of cardDistribution) {
        for (let i = 0; i < count; i++) {
          shuffleCardList.push({
            id: cardId++,
            type: design.type as any,
            name: design.name,
            value: design.type === 'empty' ? null : parseInt(design.name.replace('% OFF', '')),
            flipped: false
          })
        }
      }
      
      // Shuffle the cards to randomize positions
      for (let i = shuffleCardList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleCardList[i], shuffleCardList[j]] = [shuffleCardList[j], shuffleCardList[i]]
      }
      
      setShuffleCards(shuffleCardList)
    }
    
    generateShuffleCards()
  }, [router])

  const performShuffle = () => {
    return new Promise<void>((resolve) => {
      setShuffling(true)
      
      let shuffleCount = 0
      const maxShuffles = 20
      
      const shuffleInterval = setInterval(() => {
        // 카드들을 랜덤하게 섞기
        setShuffleCards(prev => {
          const newCards = [...prev]
          for (let i = newCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[newCards[i], newCards[j]] = [newCards[j], newCards[i]]
          }
          return newCards
        })
        
        shuffleCount++
        if (shuffleCount >= maxShuffles) {
          clearInterval(shuffleInterval)
          setTimeout(() => {
            setShuffling(false)
            resolve()
          }, 500)
        }
      }, 100)
    })
  }

  const handleCardSelect = async (cardId: number) => {
    if (selectedCard !== null || isDrawing) return

    setSelectedCard(cardId)
    setIsDrawing(true)

    try {
      // 먼저 셔플 애니메이션 실행
      await performShuffle()

      const response = await fetch('/api/lottery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerId }),
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data.result)
        
        // 선택된 카드에 결과 적용
        setCards(prev => prev.map(card => 
          card.id === cardId 
            ? { ...card, ...data.result, flipped: true }
            : card
        ))
      } else {
        alert(data.error || 'Lottery draw failed.')
        router.push('/')
      }
    } catch (error) {
      console.error('Lottery error:', error)
      alert('An error occurred during lottery draw.')
      router.push('/')
    } finally {
      setIsDrawing(false)
    }
  }

  const getCardDesign = (card: LotteryCard) => {
    const design = CARD_DESIGNS.find(d => d.type === card.type) || CARD_DESIGNS[0]
    return design
  }

  const handleComplete = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 px-6 py-6">
      <div className="flex flex-col items-center">
        <Logo size="lg" />
        
        <div className="mt-8 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            🎰 Lottery Event
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Congratulations on collecting 5 stamps!<br />
            Choose 1 card to reveal your prize
          </p>
        </div>

{shuffling ? (
          <div className="mb-8">
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-purple-600 mb-2">
                🎲 Shuffling... 🎲
              </div>
              <div className="text-sm text-gray-600">
                100 cards are being shuffled!
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1 max-h-40 overflow-hidden">
              {shuffleCards.slice(0, 40).map((card, index) => {
                const design = getCardDesign(card)
                return (
                  <div
                    key={index}
                    className={`
                      w-8 h-10 rounded-sm ${design.bgColor} ${design.textColor}
                      transform transition-all duration-100
                      ${Math.random() > 0.5 ? 'rotate-3' : '-rotate-3'}
                      ${Math.random() > 0.5 ? 'scale-105' : 'scale-95'}
                    `}
                    style={{
                      animation: `shuffle 0.1s ease-in-out infinite alternate`
                    }}
                  >
                    <div className="flex items-center justify-center h-full text-xs">
                      {design.emoji}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {cards.map((card) => {
              const design = getCardDesign(card)
              return (
                <div
                  key={card.id}
                  className={`
                    relative w-32 h-40 rounded-lg cursor-pointer transition-all duration-300
                    ${card.flipped 
                      ? `${design.bgColor} ${design.textColor} shadow-lg transform scale-105` 
                      : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md hover:shadow-lg hover:scale-105'
                    }
                    ${selectedCard === card.id && !card.flipped ? 'animate-pulse' : ''}
                    ${selectedCard !== null && selectedCard !== card.id ? 'opacity-50' : ''}
                  `}
                  onClick={() => handleCardSelect(card.id)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    {card.flipped ? (
                      <>
                        <div className="text-2xl mb-2">{design.emoji}</div>
                        <div className="text-center">
                          <div className="text-sm font-bold mb-1">{card.name}</div>
                          {card.value && (
                            <div className="text-xs opacity-90">{card.value}% 할인</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl mb-2">🎁</div>
                        <div className="text-sm font-bold">Card {card.id}</div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {result && (
          <div className="text-center mb-6">
            <div className={`
              rounded-lg p-6 shadow-lg border-2 transition-all duration-500
              ${result.type === 'empty' 
                ? 'bg-gray-100 border-gray-300' 
                : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300'
              }
            `}>
              {result.type === 'empty' ? (
                <>
                  <div className="text-6xl mb-3 animate-bounce">🤡🎪</div>
                  <div className="text-xl font-bold mb-2 text-purple-700 animate-pulse">
                    OOPS! No prize this time! 😭
                  </div>
                  <div className="text-gray-600 bg-gradient-to-r from-pink-200 to-purple-200 rounded-lg p-3 border-2 border-dotted border-purple-300">
                    <div className="text-sm">🎭 Better luck next time! 🎈</div>
                    <div className="text-xs mt-1 opacity-75">Keep collecting stamps for more chances!</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-3">🎉</div>
                  <div className="text-xl font-bold mb-2 text-green-600">
                    Congratulations!
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200 mb-3">
                    <div className="text-2xl font-bold text-green-700 mb-1">
                      {result.name} Coupon
                    </div>
                    <div className="text-sm text-gray-600">
                      Valid for 30 days - discount coupon issued!
                    </div>
                  </div>
                  <div className="text-green-600 font-medium">
                    🎁 Coupon automatically saved to your account!
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {selectedCard !== null && (
          <button
            onClick={handleComplete}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Complete
          </button>
        )}

{isDrawing && !result && (
          <div className="text-center text-gray-600 mb-6">
            <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-purple-200">
              <div className="animate-spin text-4xl mb-3">🎲</div>
              <div className="text-lg font-bold text-purple-600 mb-2">Drawing lottery...</div>
              <div className="text-sm text-gray-600">
                {shuffling ? 'Shuffling cards...' : 'Checking results...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}