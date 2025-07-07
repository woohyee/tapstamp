# TagStamp - NFC 기반 세탁소 고객 충성도 시스템

캐나다 세탁소를 위한 NFC 기반 스탬프 적립 및 리워드 시스템입니다.

## 🎯 주요 기능

### 고객용 기능
- **NFC 태그 시스템**: 단일 URL (`/stamp`)로 모든 프로세스 자동 처리
- **자동 고객 인식**: 브라우저 로컬스토리지 기반 고객 식별
- **스탬프 적립**: $10 이상 결제 시 자동 적립
- **리워드 시스템**: 10개/15개 달성 시 할인 쿠폰 자동 발급
- **이벤트 게임**: 5의 배수 스탬프 달성 시 뽑기/사다리 게임
- **VIP 멤버십**: 30개 달성 시 1년간 10% 할인

### 관리자용 기능
- **고객 검색**: 전화번호로 고객 검색
- **수동 스탬프 적립**: NFC 실패 시 수동 처리
- **쿠폰 발급**: 10%/20% 할인 쿠폰 직접 발급
- **VIP 관리**: VIP 상태 수동 설정/해제

## 🛠️ 기술 스택

- **Frontend**: React + Next.js 15 + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Hosting**: Vercel + Supabase
- **Icons**: Lucide React

## 📋 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
cd tagstamp
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `supabase-schema.sql` 파일의 내용을 SQL 에디터에서 실행
3. API 키들을 `.env.local`에 추가

### 4. 개발 서버 실행

```bash
npm run dev
```

## 🔄 시스템 플로우

### NFC 태그 프로세스

```
매장 NFC 카드: https://your-domain.com/stamp

신규 고객:
NFC 태그 → 등록 폼 → 고객 정보 입력 → 첫 스탬프 적립

기존 고객:
NFC 태그 → 자동 고객 인식 → 즉시 스탬프 적립
```

### 리워드 시스템

| 달성 조건 | 혜택 |
|---------|------|
| 10회 달성 | 10% 할인 쿠폰 |
| 15회 달성 | 20% 할인 쿠폰 |
| 매 10회 반복 | 10% 할인 쿠폰 |
| 매 5회차 | 이벤트 게임 참여 |
| 30회 달성 | VIP 멤버십 (1년간 10% 할인) |

## 📱 페이지 구조

- `/` - 고객 대시보드 (스탬프 현황, 쿠폰 관리)
- `/stamp` - NFC 태그 진입점 (자동 등록/적립)
- `/admin` - 관리자 시스템 (고객 관리, 수동 적립)
- `/event` - 이벤트 게임 (뽑기, 사다리타기)

## 🗄️ 데이터베이스 스키마

### customers 테이블
- `id` (UUID): 고객 고유 ID
- `name` (TEXT): 고객 이름
- `phone` (TEXT): 전화번호 (UNIQUE)
- `email` (TEXT): 이메일 (선택사항)
- `stamps` (INTEGER): 스탬프 개수
- `vip_status` (BOOLEAN): VIP 상태
- `vip_expires_at` (TIMESTAMP): VIP 만료일

### stamps 테이블
- `id` (UUID): 스탬프 고유 ID
- `customer_id` (UUID): 고객 ID
- `amount` (DECIMAL): 결제 금액
- `created_at` (TIMESTAMP): 적립 일시

### coupons 테이블
- `id` (UUID): 쿠폰 고유 ID
- `customer_id` (UUID): 고객 ID
- `type` (TEXT): 쿠폰 종류
- `value` (INTEGER): 할인율/금액
- `used` (BOOLEAN): 사용 여부
- `expires_at` (TIMESTAMP): 만료일

### events 테이블
- `id` (UUID): 이벤트 고유 ID
- `customer_id` (UUID): 고객 ID
- `type` (TEXT): 게임 종류
- `result` (TEXT): 게임 결과
- `reward_coupon_id` (UUID): 리워드 쿠폰 ID

## 🚀 배포

### Vercel 배포

1. Vercel 계정에 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 완료

### NFC 태그 설정

1. NFC 태그에 `https://your-domain.com/stamp` URL 저장
2. 매장에 NFC 태그 배치
3. 고객이 스마트폰으로 태그하면 자동 실행

## 📊 사용법

### 고객 사용법

1. **첫 방문**: NFC 태그 → 정보 입력 → 첫 스탬프 적립
2. **재방문**: NFC 태그 → 자동 스탬프 적립
3. **현황 확인**: 브라우저로 메인 URL 접속
4. **쿠폰 사용**: 대시보드에서 "사용하기" 버튼 클릭

### 관리자 사용법

1. `/admin` 페이지 접속
2. 전화번호로 고객 검색
3. 필요시 수동 스탬프 적립 또는 쿠폰 발급
4. VIP 상태 관리

## 🔧 커스터마이징

### 스탬프 적립 조건 변경

`src/app/api/stamp/route.ts`에서 최소 금액 수정:

```typescript
if (body.amount < 10) {  // 여기서 10을 원하는 금액으로 변경
```

### 리워드 조건 변경

`checkAndIssueCoupons` 함수에서 조건 수정:

```typescript
if (stamps === 10) {  // 10개 달성 시 쿠폰 발급
```

### 이벤트 확률 조정

`src/app/event/page.tsx`에서 확률 수정:

```typescript
const outcomes = [
  { result: '꽝', probability: 0.4 },  // 40% 확률
  { result: '5% 할인', probability: 0.3 },  // 30% 확률
  // ...
]
```

## 🎨 UI 커스터마이징

TailwindCSS 클래스를 수정하여 색상 및 스타일 변경 가능:

- 주요 색상: `blue-600`, `green-600`, `purple-600`
- 배경색: `bg-gray-50`, `bg-blue-50`
- 카드 스타일: `rounded-lg shadow-lg`

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 GitHub Issues를 통해 알려주세요.

---

**TagStamp** - 세탁소 고객 충성도를 높이는 스마트한 솔루션 🚀