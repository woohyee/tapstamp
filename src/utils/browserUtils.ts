/**
 * 브라우저를 완전히 닫거나 사용자를 적절한 위치로 이동시키는 유틸리티 함수들
 */

export const closeBrowserOrRedirect = () => {
  try {
    console.log('🧹 Redirecting to google.com...')
    
    // google.com으로 리다이렉트
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
    
    // 관리자도 google.com으로 통일
    window.location.replace('https://google.com')
    
  } catch (error) {
    console.log('Admin session close failed:', error)
    window.location.href = 'about:blank'
  }
}