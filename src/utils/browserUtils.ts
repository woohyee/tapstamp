/**
 * 브라우저를 완전히 닫거나 사용자를 적절한 위치로 이동시키는 유틸리티 함수들
 */

export const closeBrowserOrRedirect = () => {
  try {
    // 1. 일반적인 window.close() 시도
    if (window.opener) {
      window.close()
      return
    }

    // 2. 모바일 브라우저에서 탭 닫기 시도
    if (window.history.length > 1) {
      // 브라우저 히스토리가 있으면 뒤로가기
      window.history.back()
      return
    }

    // 3. 빈 페이지로 이동 후 닫기 시도
    window.location.replace('about:blank')
    
    // 4. 약간의 지연 후 다시 닫기 시도
    setTimeout(() => {
      try {
        window.close()
      } catch (e) {
        // 닫기 실패시 빈 페이지에 메시지 표시
        document.body.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            background: #f9fafb;
            margin: 0;
            padding: 20px;
          ">
            <div style="
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            ">
              <h2 style="color: #1f2937; margin-bottom: 16px; font-size: 20px;">
                ✅ Complete!
              </h2>
              <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
                You can now close this browser tab or return to your app.
              </p>
              <button onclick="window.close()" style="
                background: linear-gradient(to right, #f97316, #eab308);
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Close Tab
              </button>
            </div>
          </div>
        `
      }
    }, 100)
    
  } catch (error) {
    console.log('Browser close attempt failed:', error)
    // 최후의 수단으로 빈 페이지로 이동
    window.location.href = 'about:blank'
  }
}

export const closeAdminSession = () => {
  try {
    // 관리자 세션 정리
    localStorage.removeItem('tagstamp_admin_token')
    localStorage.removeItem('tagstamp_admin_expiry')
    
    // 브라우저 닫기 시도
    closeBrowserOrRedirect()
  } catch (error) {
    console.log('Admin session close failed:', error)
    window.location.href = 'about:blank'
  }
}