<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { fly, scale, fade } from 'svelte/transition';
  import type { User, Stamp } from '$lib/types';
  import { db, isFirebaseConfigured } from '$lib/firebase.js';
  import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
  
  let currentUser: User | null = null;
  let userStamps: Stamp[] = [];
  let loading: boolean = false;
  let isFirstVisit: boolean = false;
  let currentStamps: number = 0; // 현재 사용 가능한 스탬프 수
  
  // 웰컴 애니메이션 관련 변수들
  let showStamp: boolean = false;
  let showMessage: boolean = false;
  let welcomeVisible: boolean = true;
  
  // 스탬프 상세 정보 모달 관련
  let showDetails: boolean = false;
  let totalStamps: number = 0; // 총 수집한 스탬프 수
  let usedStamps: number = 0; // 사용한 스탬프 수
  let availableStamps: number = 0; // 현재 사용 가능한 스탬프 수
  
  onMount(() => {
    loadUserData();
    checkIfFirstVisit();
  });
  
  async function loadUserData(): Promise<void> {
    // 로컬 저장소에서 사용자 정보 읽기
    const savedUser = localStorage.getItem('stampBookUser');
    if (!savedUser) {
      // 첫 스캔 - 등록 페이지로 이동
      goto('/register');
      return;
    }
    
    try {
      currentUser = JSON.parse(savedUser) as User;
      
      // Firebase에서 스탬프 데이터 로드
      await loadStampsFromFirebase();
      
    } catch (error) {
      console.error('Error loading user data:', error);
      goto('/register');
      return;
    }
  }

  async function loadStampsFromFirebase(): Promise<void> {
    if (!currentUser || !db || !isFirebaseConfigured()) {
      console.log('Firebase not available, using local data');
      loadLocalStamps();
      return;
    }

    loading = true;
    
    try {
      // Firebase에서 사용자의 스탬프 데이터 가져오기
      const stampsQuery = query(
        collection(db, 'stamps'),
        where('userId', '==', currentUser.id)
      );
      
      const stampsSnapshot = await getDocs(stampsQuery);
      
      userStamps = stampsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Stamp[];
      
      // 최신순으로 정렬
      userStamps.sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      currentStamps = userStamps.length;
      calculateStampStats();
      
      console.log(`Loaded ${userStamps.length} stamps from Firebase`);
      
    } catch (error) {
      console.error('Error loading stamps from Firebase:', error);
      // Firebase 실패 시 로컬 데이터로 fallback
      loadLocalStamps();
    } finally {
      loading = false;
    }
  }

  function loadLocalStamps(): void {
    // 로컬 저장소에서 스탬프 데이터 읽기 (fallback)
    const savedStamps = localStorage.getItem('userStamps');
    if (savedStamps) {
      try {
        userStamps = JSON.parse(savedStamps) as Stamp[];
        currentStamps = userStamps.length;
        calculateStampStats();
        console.log(`Loaded ${userStamps.length} stamps from local storage`);
      } catch (error) {
        console.error('Error parsing local stamps:', error);
        userStamps = [];
        currentStamps = 0;
      }
    }
  }
  
  function checkIfFirstVisit(): void {
    // 첫 등록 플래그 확인 (등록 완료 후 웰컴 페이지 표시용)
    const isFirstReg = localStorage.getItem('isFirstRegistration');
    
    if (isFirstReg === 'true') {
      isFirstVisit = true;
      // 첫 등록 웰컴 화면을 한 번 보여준 후 플래그 제거
      localStorage.removeItem('isFirstRegistration');
    } else {
      // 재방문자는 바로 "Nice to see you again" 페이지
      isFirstVisit = false;
    }
  }
  
  function closeWindow(): void {
    // 브라우저 창 닫기 시도
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }
  
  async function handleWelcomeAnimation(): Promise<void> {
    showStamp = true;
    showMessage = false;
    await tick();

    setTimeout(() => {
      showStamp = false;
      showMessage = true;
    }, 1200);
  }

  function closeWelcome(): void {
    // 첫 방문자의 경우 앱 종료
    closeWindow();
  }
  
  function calculateStampStats(): void {
    // 총 수집한 스탬프 수 (누계)
    totalStamps = userStamps.length;
    
    // 사용한 스탬프 수 (현재는 0으로 설정, 향후 리워드 시스템에서 사용)
    usedStamps = 0;
    
    // 현재 사용 가능한 스탬프 수
    availableStamps = totalStamps - usedStamps;
  }
  
  function openDetails(): void {
    calculateStampStats();
    showDetails = true;
  }
  
  function closeDetails(): void {
    showDetails = false;
  }
  
  // 첫 방문자일 때 애니메이션 시작
  $: if (isFirstVisit && welcomeVisible) {
    setTimeout(handleWelcomeAnimation, 500);
  }
</script>

<style>
  .welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    background: linear-gradient(135deg, #5CD6C0 0%, #FFC940 50%, #3F8EFC 100%);
    color: white;
    height: 100vh;
    font-family: 'Arial', sans-serif;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
  }

  .welcome-logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .welcome-logo {
    height: 100px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 8px 32px rgba(28, 30, 33, 0.3));
    background: rgba(255, 255, 255, 0.9);
    padding: 1rem;
    border-radius: 20px;
  }

  .welcome-title {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .welcome-subtitle {
    font-size: 1.3rem;
    margin-bottom: 3rem;
    color: #e0e7ff;
    font-weight: 300;
  }

  .animation-box {
    height: 180px;
    margin: 20px 0;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stamp {
    font-size: 80px;
    position: absolute;
    z-index: 10;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
  }

  .basket {
    font-size: 60px;
    margin-top: 40px;
    filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.2));
  }

  .welcome-footer {
    font-size: 1.1rem;
    margin-top: 2rem;
    color: #c7d2fe;
    line-height: 1.6;
    max-width: 300px;
  }

  .close-button {
    margin-top: 2rem;
    padding: 0.8rem 2rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }

  /* 개선된 Nice to see you 페이지 스타일 */
  .nice-to-see-container {
    background: #F9FAFB; /* Soft White */
    padding: 2.5rem 1.5rem;
    border-radius: 20px;
    border: 2px solid #5CD6C0; /* Mint Green */
    max-width: 340px;
    margin: 2rem auto;
    text-align: center;
    font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 10px 30px rgba(28, 30, 33, 0.08);
  }

  .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.3rem;
  }

  .logo {
    height: 120px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 3px 8px rgba(28, 30, 33, 0.1));
  }

  .emoji {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .headline {
    font-size: 1.4rem;
    font-weight: bold;
    margin-bottom: 0.3rem;
    color: #1C1E21; /* Charcoal Black */
  }

  .subtext {
    font-size: 1rem;
    color: #1C1E21; /* Charcoal Black */
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  .stamp-box {
    background: #FFC940; /* Stamp Yellow */
    color: #1C1E21; /* Charcoal Black */
    font-size: 3rem;
    font-weight: bold;
    padding: 1rem 0;
    border-radius: 16px;
    margin: 1.2rem 0;
    box-shadow: 0 8px 0 #E6B533; /* 더 진한 Yellow 그림자 */
    transform: scale(1.03);
  }

  .loading-text {
    font-size: 2rem;
    opacity: 0.7;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .stamp-caption {
    font-size: 0.9rem;
    color: #1C1E21; /* Charcoal Black */
    margin-bottom: 1rem;
    opacity: 0.7;
  }

  .button {
    padding: 0.75rem 1.2rem;
    border-radius: 12px;
    font-weight: bold;
    font-size: 1rem;
    border: none;
    cursor: pointer;
    margin-top: 0.6rem;
    width: 100%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s;
    position: relative;
    transform: translateY(0);
  }

  .view-btn {
    background: transparent; /* Secondary Button */
    color: #3F8EFC; /* Cool Blue */
    border: 2px solid #3F8EFC; /* Cool Blue */
    box-shadow: 0 4px 6px rgba(63, 142, 252, 0.1);
    transform: translateY(0);
  }

  .view-btn:hover {
    background: rgba(63, 142, 252, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(63, 142, 252, 0.2);
  }

  .view-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .close-btn {
    background: #FFC940; /* Stamp Yellow - Primary Button */
    color: #1C1E21; /* Charcoal Black */
    border: 1px solid #FFC940;
  }

  .close-btn:hover {
    background: #FFD666; /* 약간 밝은 Stamp Yellow */
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(255, 201, 64, 0.4);
  }

  .close-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
  }

  .footer {
    font-size: 0.85rem;
    color: #1C1E21; /* Charcoal Black */
    margin-top: 1.5rem;
    opacity: 0.6;
  }

  /* 상세 정보 모달 스타일 */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    max-width: 350px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    text-align: center;
    font-family: 'Segoe UI', sans-serif;
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    color: #374151;
  }

  .stats-grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-item {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
  }

  .stat-item.available {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border-color: #047857;
  }

  .stat-item.used {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    border-color: #b45309;
  }

  .stat-item.total {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
    border-color: #6d28d9;
  }

  .stat-number {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .modal-close-btn {
    background: #e5e7eb;
    color: #374151;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .modal-close-btn:hover {
    background: #d1d5db;
    transform: translateY(-1px);
  }
</style>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: #F9FAFB;">
  <div class="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border-4 border-gray-800">
    
    {#if isFirstVisit && welcomeVisible}
      <!-- 새로운 웰컴 애니메이션 페이지 -->
      <div class="welcome-container" transition:fade={{ duration: 300 }}>
        <div class="welcome-logo-container">
          <img src="/tapstamplogo.png" alt="TapStamp Logo" class="welcome-logo" />
        </div>
        <h1 class="welcome-title">🎉 Welcome to TapStamp!</h1>
        <h2 class="welcome-subtitle">Your first stamp is collected.</h2>

        <div class="animation-box">
          {#if showStamp}
            <div class="stamp" in:fly={{ y: -100, duration: 800 }} out:scale={{ duration: 400 }}>
              🏅
            </div>
          {/if}

          <div class="basket">🧺</div>
        </div>

        {#if showMessage}
          <div class="welcome-footer" transition:fade={{ delay: 200, duration: 600 }}>
            Enjoy your visit — don't forget to collect them all! 🎯
          </div>
        {/if}

        <button class="close-button" onclick={closeWelcome}>
          Close
        </button>
      </div>
      
          {:else}
      <!-- 재방문자용 개선된 페이지 -->
      <div class="nice-to-see-container">
        <div class="logo-container">
          <img src="/tapstamplogo.png" alt="TapStamp Logo" class="logo" />
        </div>
        <div class="headline">Stamp Collected!</div>
        <div class="subtext">You've just earned a new stamp. Keep it going! 🏅</div>

        <div class="stamp-box">
          {#if loading}
            <div class="loading-text">...</div>
          {:else}
            {currentStamps}
          {/if}
        </div>
        <div class="stamp-caption">Total stamps collected</div>

        <button class="button view-btn" onclick={openDetails}>👀 View Details</button>
        <button class="button close-btn" onclick={closeWindow}>📘 Close</button>

        <div class="footer">This is {currentUser?.name || 'Your'}'s Stamp Book</div>
      </div>
    {/if}
    
  </div>
</div>

<!-- Stamp Details Modal -->
{#if showDetails}
  <div class="modal-overlay" onclick={closeDetails}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;">
        <img src="/tapstamplogo.png" alt="TapStamp Logo" style="height: 120px; width: auto; object-fit: contain; margin-right: 0.8rem;" />
        <h2 class="modal-title" style="margin-bottom: 0; font-size: 1.2rem; white-space: nowrap;">Stamp Details</h2>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item available">
          <div class="stat-number">{availableStamps}</div>
          <div class="stat-label">Available Stamps</div>
        </div>
        
        <div class="stat-item used">
          <div class="stat-number">{usedStamps}</div>
          <div class="stat-label">Used Stamps</div>
        </div>
        
        <div class="stat-item total">
          <div class="stat-number">{totalStamps}</div>
          <div class="stat-label">Total Collected</div>
        </div>
      </div>
      
      <button class="modal-close-btn" onclick={closeDetails}>
        Close
      </button>
    </div>
  </div>
{/if}
