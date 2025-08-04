/**
 * 브라우저를 완전히 닫거나 사용자를 적절한 위치로 이동시키는 유틸리티 함수들
 */

export const closeBrowserOrRedirect = () => {
  try {
    // 🚨 좀비 문제 해결: 즉시 about:blank으로 완전 교체
    console.log('🧹 Emergency URL replacement to stop zombie behavior...')
    
    // 즉시 about:blank으로 교체 (히스토리도 완전 교체)
    window.location.replace('about:blank')
    
    // window.close() 시도
    if (window.opener) {
      window.close()
      return
    }
    
    // 4. 약간의 지연 후 다시 닫기 시도
    setTimeout(() => {
      try {
        window.close()
      } catch {
        // 닫기 실패시 브랜드 홍보와 함께 친화적인 완료 페이지 표시
        document.body.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          ">
            <div style="
              background: white;
              padding: 48px;
              border-radius: 20px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              max-width: 480px;
              border: 2px solid #fed7aa;
            ">
              <!-- 로고 영역 -->
              <div style="
                width: 120px;
                height: 120px;
                background: linear-gradient(135deg, #f97316, #eab308);
                border-radius: 50%;
                margin: 0 auto 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: white;
                font-weight: bold;
                box-shadow: 0 8px 16px rgba(249, 115, 22, 0.3);
              ">
                ✨
              </div>
              
              <!-- 브랜드 타이틀 -->
              <h1 style="
                color: #ea580c;
                margin-bottom: 12px;
                font-size: 28px;
                font-weight: 800;
                background: linear-gradient(135deg, #ea580c, #f59e0b);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              ">
                TapStamp
              </h1>
              
              <!-- Completion Message -->
              <h2 style="color: #16a34a; margin-bottom: 16px; font-size: 22px; font-weight: 700;">
                🎉 Stamp Added Successfully!
              </h2>
              
              <!-- Thank You Message -->
              <p style="color: #374151; margin-bottom: 24px; line-height: 1.6; font-size: 16px;">
                Thank you for using <strong>TapStamp</strong>!<br/>
                Simply tap your NFC device on your next visit to earn more stamps.
              </p>
              
              <!-- Rewards Guide -->
              <div style="
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 28px;
                border: 1px solid #f59e0b;
              ">
                <p style="color: #92400e; margin: 0; font-weight: 600; font-size: 14px;">
                  💝 10 Stamps = 10% Discount Coupon<br/>
                  🎁 15 Stamps = 20% Discount Coupon<br/>
                  ⭐ 30 Stamps = VIP Member Benefits
                </p>
              </div>
              
              <!-- Browser Close Guide -->
              <div style="
                background: #f3f4f6;
                padding: 16px;
                border-radius: 10px;
                margin-bottom: 24px;
              ">
                <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                  📱 How to close browser:
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 13px; line-height: 1.4;">
                  iPhone: Swipe up from bottom → Select app → Swipe up to close<br/>
                  Android: □ button → Select app → Swipe up to close<br/>
                  PC: Ctrl+W or click the X button on tab
                </p>
              </div>
              
              <!-- 액션 버튼들 -->
              <div style="display: flex; gap: 12px; flex-direction: column;">
                <button onclick="window.close()" style="
                  background: linear-gradient(135deg, #f97316, #eab308);
                  color: white;
                  padding: 14px 28px;
                  border: none;
                  border-radius: 10px;
                  font-weight: 700;
                  font-size: 16px;
                  cursor: pointer;
                  transition: all 0.3s;
                  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(249, 115, 22, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(249, 115, 22, 0.3)'">
                  🚪 Close Browser
                </button>
                
                <button onclick="window.history.back()" style="
                  background: #f3f4f6;
                  color: #374151;
                  padding: 12px 24px;
                  border: 2px solid #d1d5db;
                  border-radius: 10px;
                  font-weight: 600;
                  font-size: 14px;
                  cursor: pointer;
                  transition: all 0.3s;
                " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                  ← Back to Previous Page
                </button>
              </div>
              
              <!-- 푸터 -->
              <p style="
                color: #9ca3af;
                margin-top: 32px;
                margin-bottom: 0;
                font-size: 12px;
                font-style: italic;
              ">
                "Enjoy more benefits with simple NFC stamps!" 💫
              </p>
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
    
    // 관리자용 종료 페이지 표시
    showAdminCompletePage()
  } catch (error) {
    console.log('Admin session close failed:', error)
    closeBrowserOrRedirect()
  }
}

const showAdminCompletePage = () => {
  try {
    // 1. 일반적인 window.close() 시도
    if (window.opener) {
      window.close()
      return
    }

    // 2. 빈 페이지로 이동 후 닫기 시도 (뒤로가기 제거)
    window.location.replace('about:blank')
    
    setTimeout(() => {
      try {
        window.close()
      } catch {
        // 관리자용 완료 페이지 표시
        document.body.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            margin: 0;
            padding: 20px;
          ">
            <div style="
              background: white;
              padding: 48px;
              border-radius: 20px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              max-width: 480px;
              border: 2px solid #bfdbfe;
            ">
              <!-- 로고 영역 -->
              <div style="
                width: 120px;
                height: 120px;
                background: linear-gradient(135deg, #3b82f6, #6366f1);
                border-radius: 50%;
                margin: 0 auto 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: white;
                font-weight: bold;
                box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
              ">
                🔒
              </div>
              
              <!-- 브랜드 타이틀 -->
              <h1 style="
                color: #1d4ed8;
                margin-bottom: 12px;
                font-size: 28px;
                font-weight: 800;
                background: linear-gradient(135deg, #1d4ed8, #6366f1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              ">
                TapStamp Admin
              </h1>
              
              <!-- Completion Message -->
              <h2 style="color: #16a34a; margin-bottom: 16px; font-size: 22px; font-weight: 700;">
                ✅ Admin Task Complete!
              </h2>
              
              <!-- Thank You Message -->
              <p style="color: #374151; margin-bottom: 24px; line-height: 1.6; font-size: 16px;">
                Customer management and stamp operations have been completed successfully.<br/>
                Thank you for using the <strong>TapStamp Admin System</strong>.
              </p>
              
              <!-- System Info -->
              <div style="
                background: linear-gradient(135deg, #dbeafe, #bfdbfe);
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 28px;
                border: 1px solid #3b82f6;
              ">
                <p style="color: #1e40af; margin: 0; font-weight: 600; font-size: 14px;">
                  📈 Stamp Tracking & Management<br/>
                  👥 Customer Info Editing & Management<br/>
                  🎁 Rewards & Coupon Management<br/>
                  🔐 Secure Session Management
                </p>
              </div>
              
              <!-- Browser Close Guide -->
              <div style="
                background: #f3f4f6;
                padding: 16px;
                border-radius: 10px;
                margin-bottom: 24px;
              ">
                <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                  📱 How to close browser:
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 13px; line-height: 1.4;">
                  iPhone: Swipe up from bottom → Select app → Swipe up to close<br/>
                  Android: □ button → Select app → Swipe up to close<br/>
                  PC: Ctrl+W or click the X button on tab
                </p>
              </div>
              
              <!-- 액션 버튼들 -->
              <div style="display: flex; gap: 12px; flex-direction: column;">
                <button onclick="window.close()" style="
                  background: linear-gradient(135deg, #3b82f6, #6366f1);
                  color: white;
                  padding: 14px 28px;
                  border: none;
                  border-radius: 10px;
                  font-weight: 700;
                  font-size: 16px;
                  cursor: pointer;
                  transition: all 0.3s;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
                  🚪 Close Browser
                </button>
                
                <button onclick="window.history.back()" style="
                  background: #f3f4f6;
                  color: #374151;
                  padding: 12px 24px;
                  border: 2px solid #d1d5db;
                  border-radius: 10px;
                  font-weight: 600;
                  font-size: 14px;
                  cursor: pointer;
                  transition: all 0.3s;
                " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                  ← Back to Previous Page
                </button>
              </div>
              
              <!-- 푸터 -->
              <p style="
                color: #9ca3af;
                margin-top: 32px;
                margin-bottom: 0;
                font-size: 12px;
                font-style: italic;
              ">
                "Safe and efficient customer management system" 💼
              </p>
            </div>
          </div>
        `
      }
    }, 100)
    
  } catch (error) {
    console.log('Admin page close attempt failed:', error)
    window.location.href = 'about:blank'
  }
}