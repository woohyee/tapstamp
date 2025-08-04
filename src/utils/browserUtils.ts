/**
 * 브라우저를 완전히 닫거나 사용자를 적절한 위치로 이동시키는 유틸리티 함수들
 */

export const closeBrowserOrRedirect = () => {
  try {
    console.log('🧹 Loading google.com in current page...')
    
    // 현재 페이지에서 바로 google.com 로드 (이전 페이지 남기지 않음)
    window.location.href = 'https://google.com'
    
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
    
    // 관리자도 현재 페이지에서 google.com 로드
    window.location.href = 'https://google.com'
    
  } catch (error) {
    console.log('Admin session close failed:', error)
    window.location.href = 'about:blank'
  }
}