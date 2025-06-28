// 공통 타입 정의

export interface User {
  id?: string;
  uid?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Stamp {
  id: string;
  locationId: string;
  timestamp: Date | number;
  userId?: string;
  locationName?: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface SearchResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  stampCount: number;
}

// Firebase User 타입 (firebase/auth에서 가져올 수 있지만 여기서 정의)
export interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
}
