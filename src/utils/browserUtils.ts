/**
 * 브라우저를 완전히 닫거나 사용자를 적절한 위치로 이동시키는 유틸리티 함수들
 */

// 완전한 앱 세션 리셋 함수 
async function cleanupAllResources() {
  try {
    console.log('🧹 Starting complete app cleanup...')
    
    // 1. 저장소 데이터 선별 삭제 (고객 정보는 보존)
    console.log('🗑️ Clearing problematic storage (preserving customer data)...')
    if (typeof window !== 'undefined') {
      // 고객 ID 백업
      const customerId = localStorage.getItem('tagstamp_customer_id')
      
      // 모든 localStorage 정리
      localStorage.clear()
      
      // 고객 ID만 복원 (자동 스탬프 적립 유지)
      if (customerId) {
        localStorage.setItem('tagstamp_customer_id', customerId)
        console.log('✅ Customer ID preserved for next visit')
      }
      
      // sessionStorage는 완전 정리 (Connection Error 원인 제거)
      sessionStorage.clear()
      
      // IndexedDB 정리 (있다면)
      try {
        if ('indexedDB' in window) {
          indexedDB.deleteDatabase('tapstamp-db')
        }
      } catch (e) {
        console.log('IndexedDB cleanup skipped:', e)
      }
    }

    // 2. 서비스 워커 및 PWA 캐시 완전 제거
    console.log('🛠️ Removing service workers and caches...')
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (let registration of registrations) {
          await registration.unregister()
          console.log('✅ Service worker unregistered')
        }
      } catch (e) {
        console.log('Service worker cleanup error:', e)
      }

      try {
        const cacheNames = await caches.keys()
        for (let name of cacheNames) {
          await caches.delete(name)
          console.log(`✅ Cache deleted: ${name}`)
        }
      } catch (e) {
        console.log('Cache cleanup error:', e)
      }
    }
    
    // 3. 모든 타이머 정리
    console.log('⏰ Clearing timers...')
    const highestTimeoutId = setTimeout(() => {}, 0)
    for (let i = 0; i <= highestTimeoutId; i++) {
      clearTimeout(i)
    }
    
    const highestIntervalId = setInterval(() => {}, 1000)
    for (let i = 0; i <= highestIntervalId; i++) {
      clearInterval(i)
    }
    
    // 4. 애니메이션 프레임 정리
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      for (let i = 0; i < 1000; i++) {
        window.cancelAnimationFrame(i)
      }
    }
    
    // 5. 이벤트 리스너 정리
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', () => {})
      window.removeEventListener('scroll', () => {})
      window.removeEventListener('click', () => {})
      window.removeEventListener('keydown', () => {})
      window.removeEventListener('beforeunload', () => {})
    }
    
    console.log('✅ Complete app cleanup finished')
  } catch (error) {
    console.log('⚠️ Cleanup error (non-critical):', error)
  }
}

export const closeBrowserOrRedirect = async () => {
  try {
    console.log('🧹 Starting complete page cleanup and redirect...')
    
    // 1. 모든 리소스 정리 (완료 대기)
    await cleanupAllResources()
    
    // 2. 구글로 이동 (페이지 교체)
    window.location.replace('https://google.com')
    
  } catch (error) {
    console.log('Browser redirect failed:', error)
    // 최후의 수단으로 빈 페이지로 이동
    window.location.href = 'about:blank'
  }
}

export const closeAdminSession = async () => {
  try {
    // 관리자 세션 정리
    localStorage.removeItem('tagstamp_admin_token')  
    localStorage.removeItem('tagstamp_admin_expiry')
    
    // 관리자도 리소스 정리 후 이동 (완료 대기)
    await cleanupAllResources()
    window.location.replace('https://google.com')
    
  } catch (error) {
    console.log('Admin session close failed:', error)
    window.location.href = 'about:blank'
  }
}