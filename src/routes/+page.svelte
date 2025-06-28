<script>
  import { onMount } from 'svelte';
  
  onMount(() => {
    // 간단한 홈페이지 - 별다른 자동 동작 없음
  });
</script>

<div class="min-h-screen flex items-center justify-center p-2 sm:p-4" style="background-color: #F9FAFB;">
  <div class="bg-white rounded-3xl shadow-xl p-4 sm:p-8 max-w-md w-full text-center">
    
    <!-- 로고 -->
    <div class="mb-6">
      <img src="/tapstamplogo.png" alt="TapStamp Logo" class="h-24 w-auto mx-auto mb-4" />
      <h1 class="text-2xl font-bold text-gray-900">TapStamp</h1>
      <p class="text-gray-600 mt-2">NFC Stamp Collection</p>
    </div>

    <!-- 테스트 링크 -->
    <div class="space-y-4">
      <a href="/test" 
         class="block w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
        🧪 Go to Test Page
      </a>
      
      <a href="/stamp/cafe-downtown" 
         class="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
        📱 Test Stamp Collection
      </a>
      
      <a href="/stampbook" 
         class="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
        📖 View Stamp Book
      </a>
    </div>

    <!-- 설명 -->
    <div class="mt-8 text-sm text-gray-500">
      <p>테스트를 위해 먼저 "Test Page"에서 데이터를 초기화하세요</p>
    </div>
    
  </div>
</div>
