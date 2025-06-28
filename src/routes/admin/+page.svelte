<script>
  import { addStamp } from '$lib/stores/stamps.js';
  import { db } from '$lib/firebase.js';
  import { collection, query, where, getDocs } from 'firebase/firestore';
  
  let phoneNumber = $state('');
  let searchResult = $state(null);
  let loading = $state(false);
  let error = $state('');
  let success = $state('');
  let selectedLocation = $state('cafe-downtown');
  let addingStamp = $state(false);
  
  // 사용 가능한 위치들
  const locations = [
    { id: 'cafe-downtown', name: '☕ Downtown Café' },
    { id: 'bookstore-main', name: '📚 Main Street Books' },
    { id: 'restaurant-plaza', name: '🍕 Plaza Restaurant' },
    { id: 'gym-fitness', name: '💪 Fitness Center' },
    { id: 'park-central', name: '🌳 Central Park' }
  ];
  
  // 전화번호 포맷팅 함수
  function formatPhoneNumber(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    return value;
  }
  
  async function searchCustomer() {
    if (!phoneNumber.trim()) {
      error = 'Please enter a phone number.';
      return;
    }
    
    loading = true;
    error = '';
    searchResult = null;
    
    try {
      // 전화번호로 사용자 검색
      const usersQuery = query(
        collection(db, 'users'), 
        where('phone', '==', phoneNumber.trim())
      );
      
      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        error = 'No customer found with the given phone number.';
        return;
      }
      
      const userData = snapshot.docs[0];
      searchResult = {
        id: userData.id,
        ...userData.data()
      };
      
      // 고객의 스탬프 개수도 가져오기
      const stampsQuery = query(
        collection(db, 'stamps'),
        where('userId', '==', userData.id)
      );
      const stampsSnapshot = await getDocs(stampsQuery);
      searchResult.stampCount = stampsSnapshot.size;
      
    } catch (err) {
      error = 'An error occurred while searching: ' + err.message;
    } finally {
      loading = false;
    }
  }
  
  async function addStampToCustomer() {
    if (!searchResult || !selectedLocation) return;
    
    addingStamp = true;
    error = '';
    success = '';
    
    try {
      await addStamp(searchResult.id, selectedLocation);
      success = `${searchResult.name} has been added ${locations.find(l => l.id === selectedLocation)?.name} stamp!`;
      
      // 스탬프 개수 업데이트
      searchResult.stampCount += 1;
      
    } catch (err) {
      error = 'An error occurred while adding the stamp: ' + err.message;
    } finally {
      addingStamp = false;
    }
  }
  
  function clearSearch() {
    phoneNumber = '';
    searchResult = null;
    error = '';
    success = '';
  }
</script>

<div class="bg-gradient-to-br from-blue-600 to-purple-700 min-h-screen p-4">
  <div class="max-w-md mx-auto">
    
    <!-- 헤더 -->
    <div class="text-center mb-8 pt-4">
      <div class="text-6xl mb-4">📱</div>
      <h1 class="text-2xl font-bold text-white mb-2">
        Stamp Management System
      </h1>
      <p class="text-blue-100">
        Search customer by phone and add stamps
      </p>
    </div>

    <!-- 검색 폼 -->
    <div class="bg-white rounded-xl p-6 mb-6 shadow-lg">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">🔍 Customer Search</h2>
      
      <div class="space-y-4">
        <div>
          <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            bind:value={phoneNumber}
            placeholder="010-1234-5678"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onkeydown={(e) => e.key === 'Enter' && searchCustomer()}
          />
        </div>
        
        <button
          onclick={searchCustomer}
          disabled={loading}
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Searching...' : 'Search Customer'}
        </button>
      </div>
    </div>

    <!-- 검색 결과 -->
    {#if searchResult}
      <div class="bg-white rounded-xl p-6 mb-6 shadow-lg">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">👤 Customer Info</h2>
        
        <div class="space-y-3 mb-6">
          <div class="flex justify-between">
            <span class="text-gray-600">Name:</span>
            <span class="font-medium">{searchResult.name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Email:</span>
            <span class="font-medium">{searchResult.email}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Phone:</span>
            <span class="font-medium">{formatPhoneNumber(searchResult.phone)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Current Stamps:</span>
            <span class="font-bold text-blue-600">{searchResult.stampCount}</span>
          </div>
        </div>

        <!-- 위치 선택 -->
        <div class="space-y-4">
          <label for="location" class="block text-sm font-medium text-gray-700">
            Select Stamp Location
          </label>
          <select
            id="location"
            bind:value={selectedLocation}
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {#each locations as location}
              <option value={location.id}>{location.name}</option>
            {/each}
          </select>

          <!-- 스탬프 추가 버튼 -->
          <button
            onclick={addStampToCustomer}
            disabled={addingStamp}
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {addingStamp ? 'Adding Stamp...' : '🎯 Add Stamp'}
          </button>
        </div>
      </div>
    {/if}

    <!-- 성공/오류 메시지 -->
    {#if success}
      <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
        ✅ {success}
      </div>
    {/if}

    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
        ❌ {error}
      </div>
    {/if}

    <!-- 액션 버튼들 -->
    <div class="space-y-3">
      {#if searchResult}
        <button
          onclick={clearSearch}
          class="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          🔄 New Search
        </button>
      {/if}
      
      <a
        href="/"
        class="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
      >
        🏠 Back to Home
      </a>
    </div>

  </div>
</div> 