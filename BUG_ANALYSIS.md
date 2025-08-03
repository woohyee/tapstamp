# TapStamp 연결 문제 근본 원인 분석

## 🚨 발견된 핵심 문제

### **문제: `sessionKey` 정의되지 않음**

**위치**: `/src/app/page.tsx` 라인 80

**현재 코드**:
```javascript
// 중복 방지 로직 완전 제거 (테스트용)
console.log('✅ Not processed yet, proceeding with stamp addition')

// 기존 고객 - 즉시 스탬프 적립
await addStampToExistingCustomer(data, sessionKey)  // ❌ sessionKey가 undefined!
```

**문제 발생 과정**:
1. 중복 방지 로직을 제거하면서 `sessionKey` 생성 코드도 함께 삭제
2. 하지만 `addStampToExistingCustomer()` 함수 호출에서는 여전히 `sessionKey` 전달 시도
3. `undefined` 값이 전달되어 함수 내부에서 오류 발생
4. 스탬프 추가 로직 실패 → "연결할 수 없음" 오류

## 🎯 동일한 문제가 발생하는 다른 위치

**위치**: `/src/app/page.tsx` 라인 119
```javascript
await addStampToExistingCustomer(existingCustomer, sessionKey)  // ❌ 여기도 동일한 문제
```

## 🛠️ 수정 방안

### **방법 1: sessionKey 파라미터 제거**
```javascript
// 수정 전
await addStampToExistingCustomer(data, sessionKey)

// 수정 후  
await addStampToExistingCustomer(data)
```

### **방법 2: addStampToExistingCustomer 함수 시그니처 수정**
```javascript
// 현재 함수 정의
const addStampToExistingCustomer = async (customerData: Customer, sessionKey: string) => {

// 수정 후
const addStampToExistingCustomer = async (customerData: Customer) => {
```

## 📋 수정해야 할 파일 목록

1. `/src/app/page.tsx`
   - 라인 80: `addStampToExistingCustomer(data, sessionKey)` → `addStampToExistingCustomer(data)`
   - 라인 119: `addStampToExistingCustomer(existingCustomer, sessionKey)` → `addStampToExistingCustomer(existingCustomer)`
   - 함수 정의부에서 sessionKey 파라미터 제거 및 관련 로직 정리

## 🔍 왜 이 문제가 놓쳤는가?

1. **점진적 코드 변경**: 중복 방지 로직을 여러 번에 걸쳐 수정하면서 일부 참조가 남아있음
2. **함수 시그니처 불일치**: 호출부는 수정했지만 함수 정의는 그대로 둠
3. **TypeScript 에러 무시**: `ignoreBuildErrors: true` 설정으로 인해 타입 에러가 숨겨짐

## ✅ 해결 후 기대 효과

- 기존 고객 재접속 시 정상적인 스탬프 추가
- API 호출 오류 해결
- "연결할 수 없음" 문제 완전 해결
- 단순하고 직관적인 로직 복원

---

**작성일**: 2025-08-03
**문제 유형**: JavaScript 런타임 오류 (undefined 변수 참조)
**우선순위**: 🔴 Critical (핵심 기능 완전 차단)