/**
 * 브라우저를 완전히 닫거나 사용자를 적절한 위치로 이동시키는 유틸리티 함수들
 */

// 모든 페이지 리소스 정리 함수
function cleanupAllResources() {
  try {
    console.log('🧹 Cleaning up page resources...')
    
    // 1. 모든 타이머 정리
    const highestTimeoutId = setTimeout(() => {}, 0)
    for (let i = 0; i <= highestTimeoutId; i++) {
      clearTimeout(i)
    }
    
    const highestIntervalId = setInterval(() => {}, 1000)
    for (let i = 0; i <= highestIntervalId; i++) {
      clearInterval(i)
    }
    
    // 2. 애니메이션 프레임 정리
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      // 일반적인 animationFrame ID 범위 정리
      for (let i = 0; i < 1000; i++) {
        window.cancelAnimationFrame(i)
      }
    }
    
    // 3. 이벤트 리스너 정리 (주요 이벤트들)
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', () => {})
      window.removeEventListener('scroll', () => {})
      window.removeEventListener('click', () => {})
      window.removeEventListener('keydown', () => {})
      window.removeEventListener('beforeunload', () => {})
    }
    
    // 4. React 상태 정리를 위한 DOM 클리어
    if (typeof document !== 'undefined') {
      const rootElement = document.getElementById('__next') || document.body
      if (rootElement) {
        // React 이벤트 리스너들 정리
        const allElements = rootElement.querySelectorAll('*')
        allElements.forEach(element => {
          const clonedElement = element.cloneNode(true)
          if (element.parentNode) {
            element.parentNode.replaceChild(clonedElement, element)
          }
        })
      }
    }
    
    console.log('✅ Page resources cleaned up')
  } catch (error) {
    console.log('⚠️ Resource cleanup error (non-critical):', error)
  }
}

export const closeBrowserOrRedirect = () => {
  try {
    console.log('🧹 Starting complete page cleanup and redirect...')
    
    // 1. 모든 리소스 정리
    cleanupAllResources()
    
    // 2. 구글로 이동 (페이지 교체)
    window.location.replace('https://google.com')
    
  } catch (error) {
    console.log('Browser redirect failed:', error)
    // 최후의 수단으로 빈 페이지로 이동
    window.location.href = 'about:blank'
  }
}

export const closeAdminSession = () => {
  try {
    // 관리자 세션 정리
    localStorage.removeItem('tagstamp_admin_token')  
    localStorage.removeItem('tagstamp_admin_expiry')
    
    // 관리자도 리소스 정리 후 이동
    cleanupAllResources()
    window.location.replace('https://google.com')
    
  } catch (error) {
    console.log('Admin session close failed:', error)
    window.location.href = 'about:blank'
  }
}