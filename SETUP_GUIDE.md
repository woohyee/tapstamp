# 🚀 TapStamp 실시간 알림 시스템 설정 가이드

이 가이드를 따라 **3초 이내 실시간 알림**을 설정하세요!

## 📋 **설정 순서**

### ✅ **이미 완료된 것들**
- PWA 매니페스트 및 Service Worker
- FCM 클라이언트 설정
- SMS 백업 시스템
- 관리자 페이지 통합
- 쿠폰 사용 API 실시간 알림 로직

### 🔧 **추가로 해야 할 것들**

---

## 1️⃣ **Firebase FCM 설정**

### **Firebase 콘솔에서 작업**

1. **Firebase 콘솔 접속**: https://console.firebase.google.com
2. **기존 프로젝트 선택** (tapstamp 프로젝트)
3. **Cloud Messaging 활성화**:
   - 왼쪽 메뉴 > Build > Messaging
   - "Get started" 클릭

### **FCM 서버 키 받기**

1. **프로젝트 설정 > Cloud Messaging 탭**
2. **Server key 복사** → `FCM_SERVER_KEY` 환경변수에 추가
3. **Web Push certificates**:
   - "Generate key pair" 클릭 
   - 생성된 키 복사 → `NEXT_PUBLIC_FCM_VAPID_KEY` 환경변수에 추가

### **Firebase 설정 완료 확인**
```bash
# .env.local에 다음 값들이 있는지 확인
FCM_SERVER_KEY=AAAA.......  # Server key
NEXT_PUBLIC_FCM_VAPID_KEY=BH.......  # VAPID key
```

---

## 2️⃣ **Twilio SMS 설정**

### **Twilio 계정 생성**

1. **가입**: https://www.twilio.com/try-twilio
2. **계정 인증** 완료
3. **Console 접속**: https://console.twilio.com

### **캐나다 전화번호 구매**

1. **Phone Numbers > Manage > Buy a number**
2. **Country: Canada**
3. **Capabilities: SMS** 체크
4. **Search & Buy** (월 $1 CAD 정도)

### **Twilio 설정값 받기**

1. **Console Dashboard**에서:
   - **Account SID** 복사
   - **Auth Token** 복사
2. **Phone Numbers > Manage > Active numbers**에서:
   - 구매한 번호 복사 (+1XXXXXXXXXX 형식)

### **환경변수 설정**
```bash
# .env.local에 추가
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX  # 구매한 번호
ADMIN_PHONE_NUMBER=+1XXXXXXXXXX  # 관리자 폰번호
```

---

## 3️⃣ **시스템 테스트**

### **환경변수 확인**
```bash
npm run check-env
```

### **개발 서버 시작**
```bash
npm run dev
```

### **알림 시스템 테스트**

1. **관리자 페이지 접속**: http://localhost:3000/admin
2. **로그인** (비밀번호: 123)
3. **실시간 알림 설정 허용**:
   - 브라우저 알림 권한 허용
   - PWA 설치 안내 따르기

### **테스트 API 사용**
```bash
# FCM 테스트
curl -X POST http://localhost:3000/api/test/notifications \
  -H "Content-Type: application/json" \
  -d '{"test_type": "fcm_only"}'

# SMS 테스트  
curl -X POST http://localhost:3000/api/test/notifications \
  -H "Content-Type: application/json" \
  -d '{"test_type": "sms_only"}'

# 전체 시스템 테스트
curl -X POST http://localhost:3000/api/test/notifications \
  -H "Content-Type: application/json" \
  -d '{"test_type": "full_system"}'
```

---

## 4️⃣ **실제 쿠폰 사용 테스트**

### **시나리오 1: 일반 쿠폰 (FCM만)**
1. 고객 페이지에서 5% 쿠폰 사용
2. **예상 결과**: FCM 푸시 알림만 발송

### **시나리오 2: 고액 쿠폰 (FCM + SMS)**
1. 고객 페이지에서 15% 쿠폰 사용  
2. **예상 결과**: FCM 푸시 + SMS 동시 발송

### **성능 확인**
- 브라우저 콘솔에서 알림 속도 확인
- **목표**: 3초 이내 알림 전달

---

## 5️⃣ **PWA 설치 (모바일)**

### **Android Chrome**
1. 관리자 페이지 접속
2. 주소창 오른쪽 "설치" 아이콘 클릭
3. "설치" 확인

### **iOS Safari**
1. 관리자 페이지 접속
2. 하단 공유 버튼 → "홈 화면에 추가"
3. "추가" 확인

---

## 🎯 **최종 확인 체크리스트**

### **환경변수 설정** ✅
- [ ] Firebase 설정 (6개 항목)
- [ ] FCM 키 (2개 항목)  
- [ ] Twilio 설정 (4개 항목)

### **기능 테스트** ✅
- [ ] FCM 푸시 알림 수신
- [ ] SMS 백업 수신
- [ ] PWA 설치 완료
- [ ] 실시간 알림 3초 이내

### **실전 테스트** ✅
- [ ] 실제 쿠폰 사용시 즉시 알림
- [ ] 관리자 폰에서 알림 확인
- [ ] 앱 닫힌 상태에서도 알림 수신

---

## 🚨 **문제 해결**

### **FCM 알림이 안 올 때**
1. 브라우저 알림 권한 확인
2. FCM 키 설정 재확인
3. 개발자 도구 콘솔 에러 확인

### **SMS가 안 올 때**
1. Twilio 계정 잔액 확인
2. 관리자 폰번호 형식 확인 (+1XXXXXXXXXX)
3. Twilio Console에서 SMS 로그 확인

### **PWA 설치가 안 될 때**
1. HTTPS 연결 확인 (localhost는 OK)
2. manifest.json 접속 확인
3. Service Worker 등록 확인

---

## 💰 **예상 운영 비용**

### **월간 비용 (쿠폰 100건 기준)**
- **FCM**: 무료
- **SMS**: ~$1 CAD (고액 쿠폰 + 실패 백업만)
- **Twilio 번호**: $1 CAD/월
- **총 예상**: $2 CAD/월

### **ROI 계산**
- **매출 손실 방지**: $30 CAD/월 (추정)
- **시스템 비용**: $2 CAD/월
- **순이익**: $28 CAD/월 (1,400% ROI)

---

## 🎉 **설정 완료 후**

**축하합니다!** 이제 TapStamp가 **3초 이내 실시간 알림**을 지원합니다!

### **다음 단계**
1. 실제 운영 환경에서 1주일 테스트
2. 알림 성공률 모니터링
3. 필요시 SMS 발송 조건 조정
4. 추가 관리 기능 구현 계획

---

**질문이나 문제가 있으면 언제든 연락하세요! 🚀**