<script lang="ts">
  import { goto } from '$app/navigation';

  function clearAllData(): void {
    try {
      // 로컬 저장소 초기화
      localStorage.removeItem('stampBookUser');
      localStorage.removeItem('userStamps');
      localStorage.removeItem('isFirstRegistration');
      
      alert('✅ 데이터베이스가 초기화되었습니다!\n이제 처음 사용자처럼 등록부터 시작할 수 있습니다.');
      
      // 홈페이지로 이동
      goto('/');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('❌ 초기화 중 오류가 발생했습니다.');
    }
  }

  function simulateFirstVisit(): void {
    try {
      localStorage.setItem('isFirstRegistration', 'true');
      alert('✅ 첫 방문 모드로 설정되었습니다!\n다음 스탬프 수집 시 웰컴 애니메이션이 표시됩니다.');
    } catch (error) {
      console.error('Error setting first visit:', error);
    }
  }

  function showCurrentData(): void {
    const user = localStorage.getItem('stampBookUser');
    const stamps = localStorage.getItem('userStamps');
    const isFirst = localStorage.getItem('isFirstRegistration');
    
    const userData = user ? JSON.parse(user) : null;
    const stampData = stamps ? JSON.parse(stamps) : [];
    
    alert(`📊 현재 데이터 상태:
    
사용자: ${userData ? userData.name : '등록되지 않음'}
스탬프 수: ${stampData.length}개
첫 방문 플래그: ${isFirst || '없음'}`);
  }
</script>

<style>
  .test-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: 'Segoe UI', sans-serif;
  }
  
  .test-section {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .test-section h2 {
    color: #374151;
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }
  
  .test-button {
    background: #3F8EFC;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    margin: 0.5rem 0.5rem 0.5rem 0;
    transition: all 0.2s;
  }
  
  .test-button:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .test-button.danger {
    background: #ef4444;
  }
  
  .test-button.danger:hover {
    background: #dc2626;
  }
  
  .test-button.secondary {
    background: #6b7280;
  }
  
  .test-button.secondary:hover {
    background: #4b5563;
  }
  
  .navigation-links {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .nav-link {
    color: #3F8EFC;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border: 2px solid #3F8EFC;
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .nav-link:hover {
    background: #3F8EFC;
    color: white;
  }
</style>

<div class="test-container">
  <h1>🧪 TapStamp 테스트 페이지</h1>
  <p>개발 및 테스트를 위한 도구들입니다.</p>

  <div class="test-section">
    <h2>🔄 데이터베이스 관리</h2>
    <button class="test-button danger" on:click={clearAllData}>
      🗑️ 전체 데이터 초기화
    </button>
    <button class="test-button secondary" on:click={showCurrentData}>
      📊 현재 데이터 확인
    </button>
    <p><small>⚠️ 초기화하면 모든 사용자 정보와 스탬프가 삭제됩니다.</small></p>
  </div>

  <div class="test-section">
    <h2>🎭 테스트 모드</h2>
    <button class="test-button" on:click={simulateFirstVisit}>
      🎉 첫 방문 모드 설정
    </button>
    <p><small>다음 스탬프 수집 시 웰컴 애니메이션이 표시됩니다.</small></p>
  </div>

  <div class="test-section">
    <h2>🔗 빠른 이동</h2>
    <div class="navigation-links">
      <a href="/" class="nav-link">🏠 홈페이지</a>
      <a href="/register" class="nav-link">📝 등록</a>
      <a href="/stampbook" class="nav-link">📖 스탬프북</a>
      <a href="/admin" class="nav-link">⚙️ 관리자</a>
    </div>
  </div>
</div> 