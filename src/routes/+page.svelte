<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let loading = $state(true);
  let message = $state('');
  let isExistingUser = $state(false);
  let userData = $state(null);
  let stampCount = $state(0);
  
  onMount(async () => {
    // 로컬 저장소에서 기존 사용자 정보 확인
    const savedUser = localStorage.getItem('stampBookUser');
    
    if (savedUser) {
      // 기존 사용자 - 바로 스탬프북으로 이동
      userData = JSON.parse(savedUser);
      isExistingUser = true;
      
      // 기존 스탬프 개수 확인
      const stamps = JSON.parse(localStorage.getItem('userStamps') || '[]');
      stampCount = stamps.length;
      
      // 자동으로 스탬프 1개 추가
      await addNewStamp();
      
    } else {
      // 신규 사용자 - 등록 화면으로 이동
      setTimeout(() => {
        goto('/register');
      }, 1000);
    }
    
    loading = false;
  });
  
  async function addNewStamp() {
    // 새 스탬프 추가
    const stamps = JSON.parse(localStorage.getItem('userStamps') || '[]');
    const newStamp = {
      id: 'stamp_' + Date.now(),
      locationId: 'current-location',
      locationName: '🏪 Current Location',
      timestamp: new Date(),
      userId: userData.id
    };
    
    stamps.push(newStamp);
    localStorage.setItem('userStamps', JSON.stringify(stamps));
    
    stampCount = stamps.length;
    message = `✅ 1 stamp has been added!\nYou now have ${stampCount} stamps`;
    
    // 3초 후 스탬프북으로 이동
    setTimeout(() => {
      goto('/stampbook');
    }, 3000);
  }
  
  function goToStampBook() {
    goto('/stampbook');
  }
</script>

<!-- NFC 스캔 결과 화면 -->
<div class="text-center py-12">
  
  {#if loading}
    <!-- 로딩 중 -->
    <div class="text-6xl mb-4">📱</div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      Processing NFC scan...
    </h1>
    <div class="mt-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>
    
  {:else if isExistingUser}
    <!-- 기존 사용자 - 스탬프 추가 완료 -->
    <div class="animate-bounce-in">
      <div class="text-8xl mb-6">🎉</div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome back, {userData.name}!
      </h1>
      
      <div class="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-xl mx-4 mb-6">
        <div class="text-3xl mb-2">🏪 Current Location</div>
        <div class="text-sm opacity-90">
          {message}
        </div>
      </div>
      
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        Redirecting to your stamp book shortly...
      </p>
      
      <button
        onclick={goToStampBook}
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        View Stamp Book 📖
      </button>
    </div>
    
  {:else}
    <!-- 신규 사용자 - 등록 화면으로 이동 -->
    <div class="text-6xl mb-4">📝</div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      Welcome! First time here!
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Redirecting to registration...
    </p>
    <div class="mt-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>
  {/if}
  
</div>

<style>
  @keyframes bounce-in {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.6s ease-out;
  }
</style>
