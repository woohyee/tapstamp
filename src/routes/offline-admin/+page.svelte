<script>
  let phoneNumber = $state('');
  let customerName = $state('');
  let selectedLocation = $state('cafe-downtown');
  let message = $state('');
  
  const locations = [
    { id: 'cafe-downtown', name: '☕ Downtown Café' },
    { id: 'bookstore-main', name: '📚 Main Street Books' },
    { id: 'restaurant-plaza', name: '🍕 Plaza Restaurant' },
    { id: 'gym-fitness', name: '💪 Fitness Center' },
    { id: 'park-central', name: '🌳 Central Park' }
  ];
  
  function addOfflineStamp() {
    if (!phoneNumber.trim() || !customerName.trim()) {
      message = '⚠️ Please enter both phone number and customer name.';
      return;
    }
    
    const location = locations.find(l => l.id === selectedLocation);
    message = `✅ ${location?.name} stamp has been added for ${customerName} (${phoneNumber})! (Offline mode)`;
    
    // 로컬 저장소에 임시 저장
    const offlineStamps = JSON.parse(localStorage.getItem('offlineStamps') || '[]');
    offlineStamps.push({
      phone: phoneNumber,
      name: customerName,
      location: selectedLocation,
      locationName: location?.name,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('offlineStamps', JSON.stringify(offlineStamps));
    
    // 폼 초기화
    phoneNumber = '';
    customerName = '';
  }
  
  function viewOfflineStamps() {
    const stamps = JSON.parse(localStorage.getItem('offlineStamps') || '[]');
    if (stamps.length === 0) {
      message = '📝 No offline stamps saved.';
    } else {
      message = `📋 Total ${stamps.length} offline stamps are saved.`;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 p-4">
  <div class="max-w-md mx-auto">
    
    <!-- 헤더 -->
    <div class="text-center mb-8 pt-8">
      <div class="text-6xl mb-4">🔴</div>
      <h1 class="text-3xl font-bold text-white mb-2">
        Offline Admin Mode
      </h1>
      <p class="text-red-100">
        Temporary stamp management without internet
      </p>
    </div>

    <!-- 오프라인 안내 -->
    <div class="bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg mb-6">
      ⚠️ Currently in offline mode. Please sync data after internet connection.
    </div>

    <!-- 스탬프 적립 폼 -->
    <div class="bg-white rounded-xl p-6 mb-6 shadow-lg">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">📝 Offline Stamp Management</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            bind:value={customerName}
            placeholder="Enter customer name"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            bind:value={phoneNumber}
            placeholder="010-1234-5678"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Select Location
          </label>
          <select
            bind:value={selectedLocation}
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            {#each locations as location}
              <option value={location.id}>{location.name}</option>
            {/each}
          </select>
        </div>
        
        <button
          onclick={addOfflineStamp}
          class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          🎯 Add Offline Stamp
        </button>
      </div>
    </div>

    <!-- 메시지 -->
    {#if message}
      <div class="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-lg mb-4">
        {message}
      </div>
    {/if}

    <!-- 액션 버튼들 -->
    <div class="space-y-3">
      <button
        onclick={viewOfflineStamps}
        class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        📋 View Saved Stamps
      </button>
      
      <a
        href="/"
        class="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
      >
        🏠 Back to Home
      </a>
    </div>

    <!-- 안내사항 -->
    <div class="mt-6 bg-red-50 border border-red-200 p-4 rounded-lg">
      <h3 class="font-semibold text-red-900 mb-2">📌 Offline Mode Notice</h3>
      <ul class="text-sm text-red-800 space-y-1">
        <li>• Data is temporarily stored in browser</li>
        <li>• Sync to actual database required after internet connection</li>
        <li>• Data may be lost if browser data is cleared</li>
      </ul>
    </div>

  </div>
</div> 