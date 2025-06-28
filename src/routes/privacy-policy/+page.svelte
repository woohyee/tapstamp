<script>
  import { goto } from '$app/navigation';
  
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="bg-white rounded-3xl shadow-lg p-8">
    <!-- 헤더 -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
        Privacy Policy
      </h1>
      <p class="text-gray-600">TapStamp 개인정보처리방침</p>
    </div>

    <!-- 컨텐츠 -->
    <div class="prose prose-lg max-w-none">
      <div class="text-sm text-gray-500 mb-8">
        <p><strong>최종 업데이트:</strong> {new Date().toLocaleDateString('ko-KR')}</p>
        <p><strong>시행일:</strong> {new Date().toLocaleDateString('ko-KR')}</p>
      </div>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">1. 개인정보의 수집 및 이용목적</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <p class="mb-4">TapStamp는 다음과 같은 목적으로 개인정보를 수집하고 이용합니다:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>회원가입 및 관리:</strong> 본인확인, 회원 식별, 회원탈퇴 의사의 확인</li>
            <li><strong>스탬프 서비스 제공:</strong> 스탬프 적립, 리워드 제공, 서비스 이용 기록 관리</li>
            <li><strong>고객 지원:</strong> 고객 문의 응답, 불만 처리, 공지사항 전달</li>
            <li><strong>서비스 개선:</strong> 신규 서비스 개발, 맞춤형 서비스 제공</li>
          </ul>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">2. 수집하는 개인정보 항목</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <h3 class="font-semibold mb-3">필수 정보</h3>
          <ul class="list-disc pl-6 space-y-1 mb-4">
            <li>이름 (Full Name)</li>
            <li>전화번호 (Phone Number)</li>
          </ul>
          <h3 class="font-semibold mb-3">선택 정보</h3>
          <ul class="list-disc pl-6 space-y-1 mb-4">
            <li>이메일 주소 (Email Address)</li>
          </ul>
          <h3 class="font-semibold mb-3">자동 수집 정보</h3>
          <ul class="list-disc pl-6 space-y-1">
            <li>스탬프 적립 일시 및 위치</li>
            <li>서비스 이용 기록</li>
            <li>접속 로그, 접속 IP 정보</li>
          </ul>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">3. 개인정보의 보유 및 이용기간</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>회원탈퇴 시:</strong> 즉시 삭제 (단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관)</li>
            <li><strong>스탬프 적립 기록:</strong> 회원탈퇴 후 1년간 보관 (분쟁 해결 목적)</li>
            <li><strong>부정이용 기록:</strong> 1년간 보관 (재가입 제한 등 서비스 보안 목적)</li>
          </ul>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">4. 개인정보의 제3자 제공</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <p class="mb-4">TapStamp는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>정보주체가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">5. 개인정보 처리의 위탁</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <p class="mb-4">TapStamp는 서비스 향상을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">위탁받는 자</th>
                  <th class="px-4 py-2 text-left font-semibold">위탁하는 업무의 내용</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t">
                  <td class="px-4 py-2">클라우드 서비스 제공업체</td>
                  <td class="px-4 py-2">데이터 저장 및 백업</td>
                </tr>
                <tr class="border-t">
                  <td class="px-4 py-2">SMS 발송 업체</td>
                  <td class="px-4 py-2">인증번호 및 알림 메시지 발송</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">6. 정보주체의 권리·의무 및 그 행사방법</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <p class="mb-4">정보주체는 TapStamp에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>개인정보 처리현황 통지요구</li>
            <li>개인정보 열람요구</li>
            <li>개인정보 정정·삭제요구</li>
            <li>개인정보 처리정지요구</li>
          </ul>
          <p class="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400">
            <strong>권리 행사 방법:</strong> 서비스 내 설정 메뉴 또는 고객센터를 통해 요청하실 수 있습니다.
          </p>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">7. 개인정보의 안전성 확보조치</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>관리적 조치:</strong> 개인정보 취급직원의 최소화 및 교육</li>
            <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 개인정보의 암호화, 보안프로그램 설치</li>
            <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
          </ul>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">8. 개인정보 보호책임자</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <p class="mb-4">TapStamp는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:</p>
          <div class="bg-white p-4 rounded-lg border">
            <p><strong>개인정보 보호책임자</strong></p>
            <p>이메일: privacy@tapstamp.com</p>
            <p>전화: 1588-0000</p>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">9. 개인정보처리방침의 변경</h2>
        <div class="bg-gray-50 p-6 rounded-xl">
          <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
        </div>
      </section>
    </div>

    <!-- 하단 버튼 -->
    <div class="text-center mt-12 pt-8 border-t border-gray-200">
      <button
        onclick={goBack}
        class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-md"
      >
        Back to Registration
      </button>
    </div>
  </div>
</div>

<style>
  .prose h2 {
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  
  .prose h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .prose ul {
    margin-top: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .prose table {
    font-size: 0.875rem;
  }
</style> 