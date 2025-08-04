# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production (includes environment variable validation)
- `npm run build:skip-env` - Build without environment validation
- `npm run start` - Start production server
- `npm run check-env` - Validate required environment variables
- `npm run lint` - Run ESLint

**Testing:**
- No formal test suite configured
- Testing is done manually through NFC simulation and admin interface
- Use `/api/debug/coupons` endpoint for debugging coupon states

## Environment Variables

Required variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (legacy reference, system uses Firebase)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (legacy reference)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (legacy reference)

**Note:** Despite Supabase references in environment variables and package.json, the system actually uses Firebase Firestore for data persistence. The Supabase variables are maintained for legacy compatibility.

The build process automatically validates these variables using `scripts/check-env.js`. For Vercel deployment, ensure these same variables are configured in the Vercel project's Environment Variables settings.

## Pre-Launch Campaign

**dodo-cleaners-web Integration:**
- The `dodo-cleaners-web` subproject contains a promotional website for Dodo Cleaners
- The `/event` page serves as a pre-registration campaign for the TapStamp loyalty system
- Customers can register before the official launch (August 1st) and receive 1 free stamp
- This bridges the gap between the business website and the NFC-based loyalty system
- Both projects share the same Supabase database and environment variables

**Campaign Flow:**
1. Customers visit dodo-cleaners-web/event page
2. Fill out registration form (name, phone, optional email)
3. System checks for duplicates and creates new customer record
4. Automatically awards 1 stamp for event participation
5. Shows celebration animation and confirms registration

## CRITICAL FCM 이해 오류 (2025-07-30)

**중요한 실수와 교훈:**
- FCM(Firebase Cloud Messaging)은 **100% 푸시(Push) 방식**입니다
- FCM은 폴링(Polling)이 전혀 필요하지 않습니다
- 서버 이벤트 발생 → Google FCM 서버 → 클라이언트로 즉시 푸시
- **폴링 = 잘못된 접근**, FCM 사용 시 폴링 코드는 완전히 제거해야 함

**개발 중 발생한 문제:**
- FCM 구현 전까지 폴링으로 시간 낭비
- FCM과 폴링을 혼합하려는 잘못된 시도
- "폴링부터 확인하고 FCM으로 교체"라는 잘못된 계획

**올바른 접근:**
- FCM 푸시만 구현 (폴링 완전 제거)
- 실시간 알림은 FCM 푸시로만 처리
- 0.5초 이내 즉시 알림 가능

**금지사항:** 이 프로젝트에서 폴링(Polling) 방식은 더 이상 사용하지 않음

## 관리자 대시보드 실제 사용 목적 (2025-07-30 재정의)

**핵심 목적**: 고객이 쿠폰을 사용할 때 관리자가 **즉시** 그 정보를 보고 **계산을 도와주는 것**

**실제 사용 시나리오:**
1. 고객: "10% 할인 쿠폰 사용하겠습니다"
2. 관리자 화면: 🚨 **"김철수 (010-1234-5678) - 10% 할인 쿠폰 사용됨"** 즉시 표시
3. 관리자: 쿠폰 정보 확인하여 계산 처리

**UI 요구사항:**
- **메인 화면**: 현재 사용된 쿠폰 정보만 크게 표시 (계산 도움용)
- **메뉴**: 과거 쿠폰 사용 내역은 별도 메뉴에서 확인
- **언어**: 모든 텍스트 영어로 변경 (캐나다 배포용)
- **포커스**: 기술보다 **실제 업무 도움**에 집중

**잘못된 현재 구현:**
- 과거 내역이 메인 화면에 너무 많이 표시됨
- 한국어 사용 (배포 환경에 맞지 않음)
- 기술적 완성도에만 집중, 실용성 부족

## Architecture Overview

This is a Next.js 15 NFC-based customer loyalty system for laundromats with a simplified two-page structure:

### Core NFC Entry Points
- `/` - Primary customer NFC entry point (registration/stamp collection)
- `/stamp` - Alternative customer NFC entry point (identical functionality to `/`)
- `/admin` - Staff NFC entry point (manual stamp management and customer editing)

### Key System Flow
1. **Customer NFC Process**: localStorage check → direct stamp addition OR phone number input → existing/new customer handling
2. **Admin NFC Process**: Phone number input → manual stamp addition + customer status view
3. **Data Persistence**: Supabase PostgreSQL with customers, stamps, coupons, events tables

### NFC Customer Experience Requirements
**CRITICAL**: To avoid customer inconvenience, NO QR codes are used - only NFC cards provided by store.

**NFC Tap Flow:**
1. Staff hands NFC card to customer
2. Customer taps with their phone
3. **Check localStorage first**:
   - **Has customer ID**: Automatic stamp addition + celebration message
   - **No customer ID**: Prompt for phone number only
4. **Phone number check** (when localStorage empty):
   - **Existing customer**: Restore localStorage + stamp addition + celebration
   - **New customer**: Complete registration form + first stamp + celebration
5. This approach provides fast experience for regular customers while handling localStorage deletion gracefully

**Previous Implementation Issue**: 
- Old approach relied on localStorage check first
- Problem: If customer's localStorage was deleted, they would see registration form
- Then get error "already registered" when entering phone number
- New approach: Phone number first eliminates this UX problem

### Fraud Prevention Requirements for Production

**Currently Implemented (Test Mode):**
- Session-based duplicate prevention (5-minute intervals using sessionStorage)
- Prevents multiple stamps within the same browser session

**Production Requirements (To Be Implemented):**

1. **Time-based Restrictions:**
   - Prevent same customer from earning stamps within configurable intervals (30min/1hr/4hr/24hr)
   - Track `last_stamp_at` timestamp in database
   - Daily maximum stamp limits per customer

2. **Location-based Security:**
   - NFC tags should only work within store premises
   - IP address / geolocation validation
   - Store-specific NFC card validation

3. **Admin Configuration:**
   - Configurable stamp earning intervals
   - Daily/weekly stamp limits
   - Suspicious activity detection thresholds

4. **Abuse Detection:**
   - Alert system for excessive attempts in short timeframes
   - Temporary account suspension for suspected fraud
   - Admin notification system

**Database Schema Extensions for Production:**
```sql
ALTER TABLE customers ADD COLUMN last_stamp_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN daily_stamp_count INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_stamp_date DATE;
ALTER TABLE customers ADD COLUMN suspicious_activity_count INTEGER DEFAULT 0;
```

**Note:** Current implementation prioritizes ease of testing. Production deployment requires enabling fraud prevention features.

### Important Architectural Decisions

**CRITICAL SYSTEM REQUIREMENTS:**
- The registration page (`/`) MUST NOT contain any system explanations or NFC instructions
- No customer dashboard pages - only the two NFC entry points
- Stamp accumulation is visit-based only (no payment amount processing)
- Store owner manually determines $10+ purchases before offering NFC

### Database Architecture (Firebase Firestore)
- **customers**: Core customer data with stamp counts and VIP status
  - Fields: id, name, phone, email?, stamps, vip_status, vip_expires_at?, created_at, updated_at
- **stamps**: Individual stamp records (amount field exists but not used for validation)
  - Fields: id, customer_id, amount, created_at
- **coupons**: Reward coupons with types (discount_5, discount_10, discount_15, discount_20, event_reward)
  - Fields: id, customer_id, type, value, used, used_at?, expires_at?, source?, created_at
- **events**: Game participation records (lottery, ladder)
  - Fields: id, customer_id, type, result, reward_coupon_id?, created_at

### Client Configuration
- Uses Firebase Firestore for database operations (not Supabase despite package.json references)
- Local storage (`tagstamp_customer_id`) for customer identification
- Session storage for duplicate prevention (`stamp_processed_${customerId}_${today}`)
- Admin authentication via localStorage tokens (`tagstamp_admin_token`, `tagstamp_admin_expiry`)

### Type Definitions
All data interfaces are defined in `src/types/index.ts` including Customer, Stamp, Coupon, Event, and request/response types.

### API Routes
- `/api/stamp` - Handles stamp addition with automatic coupon issuance logic and event triggering
- `/api/customers` - Customer management operations (create, lookup)
- `/api/customers/lookup` - Customer search by phone number
- `/api/coupons/check` - Check for unused coupons for a customer
- `/api/coupons/issue` - Issue new coupons to customers
- `/api/coupons/use` - Mark coupons as used and notify admin
- `/api/coupons/recent` - Get recent coupon usage for admin notifications
- `/api/lottery` - Handle lottery scratch card game results
- `/api/debug/coupons` - Debug endpoint for coupon data (development only)

### Admin Authentication
- Admin access uses localStorage-based tokens with expiration (24 hours)
- Default password: "1234" (configured in admin page component)
- Token key: `tagstamp_admin_token`, expiry key: `tagstamp_admin_expiry`

The system prioritizes simplicity: visit = stamp, with business logic for rewards/VIP handled automatically in the background.

## Common Development Patterns

### NFC Flow Debugging
- Check browser console for API call logs and Firebase operations
- Use localStorage.getItem('tagstamp_customer_id') to verify customer identification
- Check sessionStorage for duplicate prevention keys: `stamp_processed_${customerId}_${today}`
- Admin dashboard shows real-time coupon usage for testing

### Event System Development
- All stamp-based events are handled in `/api/stamp/route.ts` via `checkStampEvents()` function
- Direct if-statement logic preferred over complex abstraction layers
- Events are tracked in Firebase `events` collection to prevent duplicates
- Event responses include `redirect` property for automatic page navigation

### Coupon System Workflow
1. Lottery win → `/api/coupons/issue` → database storage
2. NFC scan → `/api/coupons/check` → display unused coupons
3. Customer use → `/api/coupons/use` → mark as used + admin notification
4. Admin monitoring → `/api/coupons/recent` → real-time updates

### Mobile-First Development
- All pages designed for mobile portrait orientation
- Touch events handled for scratch card interactions
- `window.close()` patterns for browser exit after NFC completion
- FloatingInput components for space-efficient mobile forms

## Page Structure and Terminology

**IMPORTANT**: This system has NO "main page" concept. Use precise terminology:

### Customer Flow Pages (`/` route)
- **Registration Page**: New customer form (when no localStorage ID)
- **Registration Complete Page**: First stamp confirmation with welcome message
- **Stamp Added Page**: Returning customer stamp confirmation
- **Stamp Details Page**: Customer can view detailed stamp information

### Customer Flow Pages (`/stamp` route)
- **Registration Page**: Alternative NFC entry point (identical to `/`)
- **Registration Complete Page**: First stamp confirmation
- **Stamp Added Page**: Returning customer stamp confirmation

### Admin Flow Pages (`/admin` route)
- **Admin Login Page**: Password authentication
- **Admin Dashboard**: Menu for stamp management and customer management
- **Add Stamps Page**: Search customer by phone for manual stamp addition
- **Customer Found Page**: Shows customer info before adding stamp
- **Stamp Added Successfully Page**: Confirmation after manual stamp addition
- **Customer Management Page**: Search customer for editing
- **Edit Customer Page**: Customer information editing with stamp history

### UI Design Standards

**Mobile-First Layout Optimization:**
- Logo size: `xl` (230px) for optimal mobile viewing
- Container padding: `px-6 py-6` standard
- Layout: `py-4` for consistent page margins
- Floating input fields with reduced padding: `px-3 py-2.5`
- Form spacing: `space-y-4` for compact mobile layout
- Title hierarchy: `text-lg` for main titles, `text-base`/`text-sm` for subtitles

**Color Theming:**
- Customer pages: Orange-yellow gradient (`from-orange-50 to-yellow-50`)
- Admin pages: Blue-indigo gradient (`from-blue-50 to-indigo-50`)
- Buttons: Orange gradient for customer, blue gradient for admin
- Accent colors: `text-orange-600` for customer titles, `text-blue-600` for admin

**Browser Exit Flow:**
- Custom completion pages with brand promotion
- Device-specific browser closing instructions
- Rewards system information display
- Graceful fallback for cases where `window.close()` fails

**Key Components:**
- `FloatingInput`: Space-efficient input fields with animated labels
- `Logo`: Unified branding across all pages with configurable sizes (sm/md/lg)
- `browserUtils`: Handles browser closing with promotional messaging

## Deployment Notes

**Vercel Configuration:**
- Requires environment variables to be configured in Vercel dashboard
- Build command uses `npm run build` (includes env validation)
- Use `npm run build:skip-env` locally if environment variables are missing

**Local Development:**
- Uses Turbopack for faster development builds
- Environment validation runs automatically on build
- All pages use `'use client'` directive for React hooks

## Localization Policy

**Service Region: Canada**

**Language Requirements:**
- **UI Text & Customer-facing Content**: Must use English only (deployed in Canada)
- **Code Comments**: English only
- **Variable Names**: English only
- **API Messages**: English only
- **Error Messages**: English only
- **Development Communication**: Korean allowed in conversations with Claude
- **Documentation**: English only

**Implementation Notes:**
- All customer-facing text should be in English
- System messages, buttons, labels must be English
- Database content should use English
- Error handling and validation messages in English
- SMS notifications and admin alerts should use English
- Phone number formats should follow Canadian standards (+1)

## Random Coupon Lottery Event System

**Event Trigger Condition:**
- Triggers when ANY customer reaches exactly 5 stamps
- Applies to all customers (new or existing, regardless of visit number)
- Only triggers once per customer (duplicate participation prevented via events table)

## Critical Issues Resolved During Development

### Issue 1: 5개 스탬프 이벤트가 트리거되지 않는 문제

**Problem Description:**
- 고객이 5개 스탬프에 도달해도 lottery 이벤트가 실행되지 않음
- /coupon 페이지로 리다이렉트되지 않음
- 카트리지 시스템이 복잡하여 실행되지 않음

**Root Cause Analysis:**
- 복잡한 카트리지 시스템 구조로 인한 실행 실패
- checkCartridgeEvents 함수가 실제로는 호출되지 않음
- 프론트엔드에서 API 응답 처리 로직 미스매치

**Solution Applied:**
1. **복잡한 카트리지 시스템 완전 제거**
2. **직접적인 5개 스탬프 감지 로직 구현**:
```javascript
// In /api/stamp/route.ts - checkStampEvents function
async function checkStampEvents(customer: { id: string; stamps: number }) {
  const stamps = customer.stamps
  
  // 5개 스탬프 직접 체크
  if (stamps === 5) {
    console.log('🚨 5 STAMPS DETECTED! Checking lottery eligibility...')
    
    // Firebase events 컬렉션에서 중복 참여 확인
    const { query, where, getDocs, collection, addDoc } = await import('firebase/firestore')
    const eventsQuery = query(
      collection(db, 'events'), 
      where('customer_id', '==', customer.id),
      where('event_type', '==', 'lottery')
    )
    const eventsSnapshot = await getDocs(eventsQuery)
    
    if (eventsSnapshot.empty) {
      // 이벤트 참여 기록 추가
      await addDoc(collection(db, 'events'), {
        customer_id: customer.id,
        event_type: 'lottery',
        event_data: { eligible: true },
        created_at: new Date()
      })
      
      return {
        type: 'lottery',
        redirect: '/coupon',
        message: '5개 스탬프 달성! 랜덤 쿠폰 이벤트!',
        stamps: 5
      }
    }
  }
  return null
}
```

3. **프론트엔드 이벤트 처리 단순화**:
```javascript
// 프론트엔드에서 이벤트 응답 처리
if (data.eventTriggered && data.eventTriggered.redirect) {
  console.log('🎉 Event triggered, redirecting to:', data.eventTriggered.redirect)
  window.location.href = data.eventTriggered.redirect
  return
}
```

### Issue 2: Done 버튼 클릭 시 두 번째 스탬프 자동 적립 문제

**Problem Description:**
- 첫 스탬프 적립 후 Done 버튼 클릭
- 브라우저가 뒤로가기되면서 새로운 NFC 스캔으로 인식
- 의도하지 않은 두 번째 스탬프 자동 적립

**Root Cause Analysis:**
- closeBrowserOrRedirect 함수에서 `window.history.back()` 호출
- 뒤로가기 시 페이지 새로고침으로 인한 checkCustomerAndProcess 재실행
- 세션 키가 5분 단위로만 구분되어 중복 방지 효과 부족

**Solution Applied:**
1. **window.history.back() 제거**:
```javascript
// Before (문제 코드)
if (window.history.length > 1) {
  window.history.back()  // 이 부분이 문제 원인
  return
}

// After (해결된 코드)
// 뒤로가기 로직 완전 제거하고 바로 about:blank으로 이동
window.location.replace('about:blank')
```

2. **세션 키를 날짜 기반으로 강화**:
```javascript
// Before (문제 코드)
const sessionKey = `stamp_processed_${customerId}_${Date.now().toString().slice(0, -5)}` // 5분 단위

// After (해결된 코드)
const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
const sessionKey = `stamp_processed_${customerId}_${today}` // 하루 단위
```

3. **신규 고객 등록 로직 개선**:
```javascript
// 신규 고객 등록 시 바로 1개 스탬프로 생성
const docRef = await addDoc(collection(db, 'customers'), {
  name: body.name,
  phone: body.phone,
  email: body.email || null,
  stamps: 1,  // 바로 1개로 시작
  vip_status: false,
  vip_expires_at: null,
  created_at: new Date()
})

// 첫 스탬프 기록도 함께 생성
await addDoc(collection(db, 'stamps'), {
  customer_id: docRef.id,
  amount: 0,
  created_at: new Date()
})
```

### Issue 3: Firebase 데이터가 콘솔에서 보이지 않는 문제

**Problem Description:**
- API 호출은 성공하지만 Firebase 콘솔에서 데이터가 보이지 않음
- "Error loading documents" 메시지 표시

**Root Cause Analysis:**
- Firebase 보안 규칙이 콘솔 접근을 차단
- 초기 규칙이 timestamp 기반으로 설정되어 있음

**Solution Applied:**
```javascript
// Firebase 보안 규칙 수정
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 테스트용으로 모든 접근 허용
    }
  }
}
```

## Admin Real-time Notification System

**Implementation for Real-world Operations:**
- 관리자가 `/admin` 페이지를 열어두면 실시간으로 쿠폰 사용 알림 수신
- 3초마다 새로운 쿠폰 사용 내역을 폴링하여 확인
- 브라우저 알림 + 소리 알림으로 즉시 통지
- 최근 사용된 쿠폰 목록을 실시간으로 업데이트

**Admin Workflow:**
1. https://tapstamp.vercel.app/admin 접속
2. 비밀번호 "123" 입력하여 로그인
3. "알림 허용" 클릭하여 브라우저 알림 권한 승인
4. 페이지를 열어둔 상태로 대기
5. 고객이 쿠폰 사용 시 자동으로 알림 수신

**5 Stamps Detection Logic (Final Implementation):**
```javascript
// Simplified direct detection in /api/stamp/route.ts
async function checkStampEvents(customer: { id: string; stamps: number }) {
  const stamps = customer.stamps
  
  if (stamps === 5) {
    // Firebase events collection에서 중복 참여 확인
    const eventsQuery = query(
      collection(db, 'events'), 
      where('customer_id', '==', customer.id),
      where('event_type', '==', 'lottery')
    )
    const eventsSnapshot = await getDocs(eventsQuery)
    
    if (eventsSnapshot.empty) {
      // 이벤트 참여 기록 추가
      await addDoc(collection(db, 'events'), {
        customer_id: customer.id,
        event_type: 'lottery',
        event_data: { eligible: true },
        created_at: new Date()
      })
      
      return {
        type: 'lottery',
        redirect: '/coupon',
        message: '5개 스탬프 달성! 랜덤 쿠폰 이벤트!',
        stamps: 5
      }
    }
  }
  
  return null
}
```

## Development Lessons Learned

**Key Principles for Debugging Complex Systems:**
1. **Simple direct implementation is better than complex abstraction**
   - Use direct if-statements instead of cartridge systems
   - Avoid over-engineering

2. **실제 사용자 행동 패턴 고려**
   - Done 버튼 → 뒤로가기 → 새로운 스캔 인식 패턴 발견
   - 브라우저 동작에 대한 정확한 이해 필요

3. **단계별 문제 해결**
   - Firebase 연결 → Done 버튼 → 5개 스탬프 → 관리자 알림 순서로 해결
   - 한 번에 모든 문제를 해결하려 하지 않음

4. **실무 환경 시뮬레이션**
   - 관리자가 항상 현장에 있다는 전제 하에 실시간 알림 시스템 설계
   - 실제 운영 시나리오를 바탕으로 한 해결책 도출

**Final System Status:**
- ✅ NFC 기반 고객 식별 및 스탬프 적립
- ✅ 5개 스탬프 달성 시 자동 lottery 이벤트 트리거
- ✅ 스크래치 카드 게임 및 쿠폰 발급
- ✅ 쿠폰 사용 시 관리자 실시간 알림
- ✅ Firebase 데이터베이스에 모든 내역 영구 저장
- ✅ 중복 스탬프 적립 방지 시스템
- ✅ 8월 1일 런칭 준비 완료

## Future Improvements (Post-Launch TODO)

### 🔧 카트리지 시스템 재구현 (우선순위: 높음)

**왜 필요한가:**
- 현재는 5개 스탬프 이벤트만 하드코딩되어 있음
- 향후 다양한 이벤트 추가 시 코드가 복잡해질 것

**올바른 구현 방향:**
```javascript
// 조건 확인 (if문) + 모듈 실행 (카트리지) 조합
if (stamps === 5) {
  const lottery = new FiveStampLotteryCartridge()
  const result = await lottery.execute(customerId)
  return result
}

if (stamps === 10) {
  const coupon = new TenStampCouponCartridge() 
  await coupon.execute(customerId)
}

if (stamps === 15) {
  const bigCoupon = new FifteenStampBigCouponCartridge()
  await bigCoupon.execute(customerId)
}
```

**구현해야 할 추가 이벤트들:**
- 10개 스탬프: 자동 10% 할인 쿠폰 발급
- 15개 스탬프: 자동 20% 할인 쿠폰 발급  
- 30개 스탬프: VIP 승급 이벤트
- 크리스마스/신정: 시즌 특별 이벤트
- 생일 이벤트: 개인화된 쿠폰
- 첫 방문 보너스: 신규 고객 환영 이벤트

**카트리지 시스템 설계 원칙:**
1. **간단한 구조**: 과도한 추상화 지양
2. **명확한 책임**: 하나의 카트리지는 하나의 이벤트만 담당
3. **쉬운 추가**: 새로운 이벤트 카트리지를 쉽게 추가할 수 있어야 함
4. **독립적 실행**: 각 카트리지는 독립적으로 실행 가능해야 함

**구현 시점:**
- 런칭 후 안정화 완료 시점
- 두 번째 이벤트 요구사항이 나올 때
- 개발 시간 여유가 있을 때

**⚠️ 중요:** 카트리지는 좋은 패턴이지만, 긴급 상황에서는 직접 구현이 더 안전함. 시간 여유가 있을 때 차근차근 구현할 것.

## Critical Development Lessons (2025-08-03)

### 🚨 중대한 개발 교훈 및 실수 방지 가이드

**핵심 원칙: 최소한의 수정만**
- 문제가 된 부분 또는 명시적 요청 부분만 수정
- 작동하는 코드는 절대 건드리지 않음
- "개선"이라는 명목으로 불필요한 수정 금지

### Issue 4: "Use Later" 버튼으로 인한 무한 스탬프 적립 문제 (2025-08-03)

**Problem Description:**
- 쿠폰 알림 페이지에서 "Use Later" 클릭 시 홈페이지로 리다이렉트
- 홈페이지에서 localStorage 감지하여 새로운 스탬프 자동 적립
- 6번째 → 7번째 → 8번째 스탬프 무한 적립 발생

**Root Cause Analysis:**
```javascript
// 문제 코드 in alert-coupon/page.tsx
const handleUseLater = () => {
  router.push(`/?customer_id=${customerId}&stamps=${stamps}&skip_coupon_check=true`)  // ❌ 홈페이지 리다이렉트
}
```

**Critical Business Logic Violation:**
- **스탬프 적립 조건**: 오직 신규 등록 또는 새로운 NFC 접속에서만
- **위반 상황**: 페이지 내 버튼 클릭으로 스탬프 추가 적립

**Solution Applied:**
```javascript
// 해결 코드
const handleUseLater = () => {
  closeBrowserOrRedirect()  // ✅ 브라우저 닫기로 변경
}
```

**Prevention Guidelines:**
1. **스탬프 적립 보안**: 새로운 NFC 접속 외에는 절대 스탬프 적립 불가
2. **버튼 동작 검증**: 모든 버튼이 의도하지 않은 스탬프 적립을 유발하지 않는지 확인
3. **리다이렉트 주의**: 홈페이지로의 리다이렉트는 항상 새로운 스탬프 적립을 유발할 수 있음

### 개발 방법론 교훈

**❌ 잘못된 접근:**
- 문제 분석 없이 여러 코드를 동시에 수정
- "개선"이라는 명목으로 작동하는 코드 변경
- 복잡한 리팩토링으로 새로운 버그 유발

**✅ 올바른 접근:**
- 정확한 문제 지점 파악 후 최소한의 수정
- 작동하는 부분은 절대 건드리지 않음
- 한 번에 하나의 문제만 해결

**Code Modification Policy:**
- **Only fix what's broken** - 문제가 된 부분만
- **Only implement what's requested** - 요청받은 부분만  
- **Never "improve" working code** - 작동하는 코드는 개선 금지
- **Document all lessons learned** - 모든 교훈을 CLAUDE.md에 기록

## Lottery Event System (Updated Implementation)

**Event Flow:**
1. **5 Stamps Achieved**: Customer gets 5th stamp → automatic redirect to `/coupon` page
2. **Congratulations Page**: "You've won a random coupon lottery!" with PLAY button  
3. **Scratch Card Game**: Real scratch-to-reveal interface using Canvas API
4. **Result Display**: Prize revealed after 30% of card is scratched
5. **Coupon Usage**: Winner can use immediately (USE NOW) or save for later (Use Later)

**IMPORTANT - Universal Application:**
- This logic applies to ALL stamp addition scenarios:
  - New customer getting 1st stamp → no event
  - Existing customer getting 2nd, 3rd, 4th stamp → no event  
  - Existing customer getting 5th stamp → EVENT TRIGGERED
  - Existing customer getting 6th, 7th, 8th+ stamp → no event (already participated)
- Whether customer is brand new, returning, or long-time visitor is IRRELEVANT
- Whether it's their 1st visit or 100th visit is IRRELEVANT  
- ONLY the exact stamp count of 5 matters
- Phone number input triggering event = customer already had 4 stamps, now getting 5th

**Event Flow:**
1. **5 Stamps Achieved**: Customer gets 5th stamp → automatic redirect to `/coupon` page
2. **Congratulations Page**: "You've won a random coupon lottery!" with PLAY button
3. **Scratch Card Game**: Real scratch-to-reveal interface using Canvas API
4. **Result Display**: Prize revealed after 30% of card is scratched
5. **Coupon Usage**: Winner can use immediately (USE NOW) or save for later (Use Later)

**Probability System (0-99 Index Table) - UPDATED 2025-07-29:**
- **55% 5% OFF** (indices 0-54): Green 5% discount coupon - 가장 일반적인 쿠폰
- **25% 10% OFF** (indices 55-79): Blue 10% discount coupon - 중간 등급 쿠폰
- **15% 15% OFF** (indices 80-94): Purple 15% discount coupon - 고급 쿠폰
- **5% 20% OFF** (indices 95-99): Red 20% discount coupon - 최고급 쿠폰

**Technical Implementation:**
```javascript
// Updated probability logic - NO EMPTY RESULTS (꽝 완전 제거)
const LOTTERY_TABLE = [
  // 0-54: 5% OFF (55%)
  ...Array(55).fill('discount_5'),
  // 55-79: 10% OFF (25%) 
  ...Array(25).fill('discount_10'),
  // 80-94: 15% OFF (15%)
  ...Array(15).fill('discount_15'),
  // 95-99: 20% OFF (5%)
  ...Array(5).fill('discount_20')
]
const randomIndex = Math.floor(Math.random() * 100)
const result = LOTTERY_TABLE[randomIndex]
```

**중요한 변경사항 (2025-07-29):**
- **꽝(Empty) 완전 제거**: 모든 고객이 5개 스탬프 달성 시 무조건 쿠폰 획득
- **5% 할인이 메인**: 55% 확률로 가장 흔한 보상
- **고급 쿠폰 희소성 유지**: 15%와 20% 할인은 여전히 희귀 (총 20%)

**Scratch Card Features:**
- Canvas-based real scratch interaction
- Silver foil texture with gradient effects
- Mouse/touch drag support
- Auto-reveal at 30% scratched
- Progress indicator bar
- Soft brush with gradient edges for natural scratch effect

**Coupon Management:**
- **Issue**: Winning coupons automatically saved to database with 30-day expiry
- **Use Now**: Blue button → immediately marks as used + red "USED" state  
- **Done Button**: CRITICAL - Always closes browser. For winners who didn't use "USE NOW", automatically saves coupon to database for later use
- **Admin Notification**: Console log notification when coupon is used (expandable to real-time notifications)

**CRITICAL Done Button Policy:**
- **Done button ALWAYS closes browser window** - no exceptions
- **For winning results (not already used)**: Automatically saves coupon to database with "unused" status before closing
- **For winning results (already used)**: Just closes browser (coupon already marked as used)
- **For empty results**: Just closes browser (nothing to save)
- **Session tracking**: Marks lottery as completed in sessionStorage to prevent infinite loops

**Use Later Workflow (Key Business Logic):**
1. **Customer wins coupon** but doesn't have enough laundry today
2. **Clicks "Use Later"** → coupon saved to database with 30-day expiry
3. **Customer returns later** (next visit with more laundry)
4. **NFC scan triggers stamp addition** → system automatically checks for unused coupons
5. **If unused coupons found** → displays green coupon notification with "USE NOW" buttons
6. **Customer can use coupon** when they have enough laundry for discount

**NFC Scan Coupon Detection:**
- Every NFC scan (after stamp processing) automatically checks `/api/coupons/check`
- Displays unused, non-expired coupons with USE NOW buttons
- Supports multiple unused coupons per customer
- Real-time coupon usage with admin notification
- Coupons removed from display after use

**Database Integration:**
- `/api/coupons/issue` - Issues winning coupons to database
- `/api/coupons/use` - Marks coupons as used and notifies admin
- `/api/coupons/check` - Checks for unused coupons during NFC scans
- `events` table tracks lottery participation to prevent duplicates
- `coupons` table stores issued coupons with usage status and expiry dates

**UI Design:**
- Scratch card uses actual Canvas API for realistic scratch effect
- Empty result shows circus/clown theme with bounce animations
- Winning results show gradient backgrounds with celebration emojis
- All text in English for Canadian deployment
- Mobile-optimized touch interactions