<script>
  import { goto } from '$app/navigation';
  import { signInAnonymous } from '$lib/stores/auth.js';
  import { createUserProfile, addStamp } from '$lib/stores/stamps.js';
  import { db, isFirebaseConfigured } from '$lib/firebase.js';
  import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
  
  let name = $state('');
  let email = $state('');
  let phone = $state('');
  let consent = $state(false);
  let loading = $state(false);
  let error = $state('');
  let emailError = $state('');

  
  // 전화번호 포맷팅 함수
  function formatPhoneNumber(value) {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 10자리일 때만 포맷팅
    if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    
    return value;
  }
  
  // 전화번호 입력 핸들러
  function handlePhoneInput(event) {
    const value = event.target.value;
    // 입력된 값 그대로 저장 (숫자만)
    phone = value.replace(/\D/g, '');
  }

  // 이메일 유효성 검사
  function validateEmail(emailValue) {
    emailError = '';
    
    if (emailValue.trim() === '') {
      return true; // 이메일은 선택사항이므로 빈 값 허용
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      emailError = 'Please include an \'@\' in the email address.';
      return false;
    }
    
    return true;
  }

  // 이메일 입력 핸들러
  function handleEmailInput(event) {
    const value = event.target.value;
    email = value;
    validateEmail(value);
  }
  
  async function handleSubmit() {
    // 전화번호만 입력된 경우 기존 고객 체크 (테스트용)
    if (phone.trim() && !name.trim() && !consent) {
      return checkExistingCustomer();
    }
    
    // 정식 등록의 경우
    if (!name.trim() || !phone.trim() || !consent) {
      error = 'Please fill in all required fields and accept the Privacy Policy.';
      return;
    }

    // 이메일 유효성 재검사 (제출 시)
    if (email.trim() && !validateEmail(email)) {
      return; // 이메일 오류가 있으면 제출 중단
    }
    
    loading = true;
    error = '';
    
    try {
      // Firebase 설정 확인
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database connection not available. Please check your internet connection.');
      }

      // 중복 전화번호 체크
      const duplicateCheck = await checkDuplicatePhone(phone.trim());
      if (duplicateCheck.exists) {
        error = `This phone number is already registered. ${duplicateCheck.userName ? `(Registered as: ${duplicateCheck.userName})` : ''}`;
        return;
      }

      // 사용자 정보 생성
      const userId = 'user_' + Date.now();
      const userData = {
        id: userId,
        name: name.trim(),
        email: email.trim() || '',
        phone: phone.trim(),
        consent,
        createdAt: new Date()
      };
      
      // Firebase에 사용자 정보 저장
      await setDoc(doc(db, 'users', userId), userData);
      
      // Welcome 스탬프 중복 체크 후 추가
      const existingWelcomeQuery = query(
        collection(db, 'stamps'),
        where('userId', '==', userId),
        where('locationId', '==', 'welcome-stamp')
      );
      
      const existingWelcomeSnapshot = await getDocs(existingWelcomeQuery);
      
      if (existingWelcomeSnapshot.empty) {
        // Welcome 스탬프 추가 (중복이 없는 경우에만)
        const welcomeStamp = {
          locationId: 'welcome-stamp',
          locationName: '🎉 Welcome Stamp',
          timestamp: new Date(),
          userId: userId
        };
        
        await addDoc(collection(db, 'stamps'), welcomeStamp);
      }
      
      // 로컬 저장소에도 백업 (오프라인 지원용)
      localStorage.setItem('stampBookUser', JSON.stringify(userData));
      localStorage.setItem('isFirstRegistration', 'true');
      
      // 등록 완료 후 스탬프북 페이지로 이동
      goto('/stampbook');
      
    } catch (err) {
      console.error('Registration error:', err);
      error = (err instanceof Error ? err.message : String(err)) || 'Registration failed. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  async function checkDuplicatePhone(phoneNumber) {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('phone', '==', phoneNumber)
      );
      
      const userSnapshot = await getDocs(usersQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        return {
          exists: true,
          userName: userData.name,
          userId: userSnapshot.docs[0].id
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error('Error checking duplicate phone:', error);
      return { exists: false }; // 에러 시 중복 없음으로 처리
    }
  }

  async function checkExistingCustomer() {
    loading = true;
    error = '';
    
    try {
      // Firebase 설정 확인
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database connection not available. Please check your internet connection.');
      }

      // 중복 체크 함수 재사용
      const duplicateCheck = await checkDuplicatePhone(phone.trim());
      
      if (duplicateCheck.exists) {
        // 기존 사용자 발견!
        const userId = duplicateCheck.userId;
        
        // 같은 위치에서 이미 스탬프를 받았는지 체크
        const existingStampQuery = query(
          collection(db, 'stamps'),
          where('userId', '==', userId),
          where('locationId', '==', 'visit-stamp')
        );
        
        const existingStampSnapshot = await getDocs(existingStampQuery);
        
        if (existingStampSnapshot.empty) {
          // 새 스탬프 추가 (중복이 없는 경우에만)
          const newStamp = {
            locationId: 'visit-stamp',
            locationName: '🎖️ Visit Stamp',
            timestamp: new Date(),
            userId: userId
          };
          
          await addDoc(collection(db, 'stamps'), newStamp);
        }
        
        // Firebase에서 최신 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        
        // 로컬 저장소에 사용자 정보 백업
        localStorage.setItem('stampBookUser', JSON.stringify({
          id: userId,
          ...userData
        }));
        localStorage.removeItem('isFirstRegistration');
        
        // 재방문자 페이지로 이동
        goto('/stampbook');
        return;
      }
      
      // 전화번호가 일치하지 않으면 에러 표시
      error = 'Phone number not found. Please complete full registration.';
      
    } catch (err) {
      console.error('Error checking existing customer:', err);
      error = 'Error checking customer data. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<style>
  .form-container {
    background: #F9FAFB; /* Soft White */
    padding: 2rem;
    border-radius: 20px;
    max-width: 360px;
    margin: 2rem auto;
    box-shadow: 0 10px 30px rgba(28, 30, 33, 0.08);
    text-align: center;
    font-family: 'Segoe UI', sans-serif;
    border: 1px solid #D1D5DB; /* Cloud Gray */
  }

  .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.2rem;
    margin-top: -1rem;
  }

  .logo {
    height: 160px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(28, 30, 33, 0.1));
  }

  .main-title {
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    color: #1C1E21; /* Charcoal Black */
    font-weight: bold;
  }

  .subtext {
    font-size: 0.95rem;
    color: #1C1E21; /* Charcoal Black */
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  /* 테스트용 안내 박스 */
  .test-notice {
    background: rgba(92, 214, 192, 0.1); /* Mint Green 배경 */
    border: 1px solid #5CD6C0; /* Mint Green */
    border-radius: 12px;
    padding: 0.75rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    color: #1C1E21; /* Charcoal Black */
  }

  input[type="text"], input[type="email"], input[type="tel"] {
    width: 100%;
    padding: 0.8rem;
    margin-bottom: 1rem;
    border: 1px solid #D1D5DB; /* Cloud Gray */
    border-radius: 10px;
    font-size: 1rem;
    background: #FFFFFF; /* 기본 배경 */
    color: #1C1E21; /* Charcoal Black */
    transition: all 0.2s;
  }

  input[type="text"]:focus, input[type="email"]:focus, input[type="tel"]:focus {
    outline: none;
    border-color: #3F8EFC; /* Cool Blue */
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(63, 142, 252, 0.1);
  }

  input.error {
    border-color: #FF6B6B; /* Warm Red */
    background: #FFF1F1;
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    color: #1C1E21; /* Charcoal Black */
    margin-bottom: 1rem;
    text-align: left;
  }

  input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .privacy-link {
    color: #3F8EFC; /* Cool Blue */
    text-decoration: underline;
  }

  .submit-button {
    background: #FFC940; /* Stamp Yellow - Primary Button */
    color: #1C1E21; /* Charcoal Black */
    border: none;
    border-radius: 12px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(255, 201, 64, 0.2);
  }

  .submit-button:hover:not(:disabled) {
    background: #FFD666; /* 약간 밝은 Stamp Yellow */
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 201, 64, 0.3);
  }

  .submit-button:disabled {
    background: #E5E7EB; /* Disabled 배경 */
    color: #9CA3AF; /* Disabled 텍스트 */
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .error-message {
    background: #FFF1F1; /* Alert 배경 */
    border: 1px solid #FF6B6B; /* Warm Red */
    color: #FF6B6B; /* Warm Red */
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .email-error-message {
    background: #FFF1F1; /* Alert 배경 */
    border: 1px solid #FF6B6B; /* Warm Red */
    color: #FF6B6B; /* Warm Red */
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
    margin-top: 0.25rem;
    margin-bottom: 1rem;
    text-align: left;
  }

  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s ease-in-out infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: #F9FAFB;">
  <div class="form-container">
    <div class="logo-container">
      <img src="/tapstamplogo.png" alt="TapStamp Logo" class="logo" />
    </div>
    <h1 class="main-title">Welcome to TapStamp</h1>
    <div class="subtext">Start collecting stamps and unlock your rewards!</div>

    <!-- 테스트용 안내 -->
    <div class="test-notice">
      💡 <strong>Test Mode:</strong> Enter phone number only and submit to check existing customer
    </div>

    <!-- 이메일 에러 메시지 -->
    {#if emailError}
      <div class="email-error-message">
        {emailError}
      </div>
    {/if}

    <!-- 일반 에러 메시지 -->
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input 
        type="text" 
        placeholder="🔤 Full Name" 
        bind:value={name}
        disabled={loading}
      />
      
      <input 
        type="text" 
        placeholder="✉️ Email (Optional)" 
        bind:value={email}
        oninput={handleEmailInput}
        disabled={loading}
        class:error={emailError}
      />
      
      <input 
        type="tel" 
        placeholder="📱 Phone Number" 
        value={formatPhoneNumber(phone)}
        oninput={handlePhoneInput}
        disabled={loading}
      />

      <label class="checkbox-label">
        <input 
          type="checkbox" 
          bind:checked={consent}
          disabled={loading}
        />
        I agree to the <a class="privacy-link" href="/privacy-policy" target="_blank">Privacy Policy</a>.
      </label>

      <button 
        type="submit" 
        class="submit-button"
        disabled={loading}
      >
        {#if loading}
          <span class="loading-spinner"></span>
          {phone.trim() && !name.trim() && !consent ? 'Checking...' : 'Submitting...'}
        {:else}
          🚀 {phone.trim() && !name.trim() && !consent ? 'Check Existing Customer' : "Let's Start Collecting"}
        {/if}
      </button>
    </form>
  </div>
</div>


