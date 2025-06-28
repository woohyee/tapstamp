import { writable } from 'svelte/store';
import { db, isFirebaseConfigured } from '$lib/firebase.js';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  setDoc,
} from 'firebase/firestore';

export const stamps = writable([]);
export const stampsLoading = writable(false);

export async function createUserProfile(user, userData) {
  if (!db || !user) {
    throw new Error('Database not available');
  }

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  try {
    await setDoc(doc(db, 'users', user.uid), {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      createdAt: new Date(),
      consentGiven: userData.consent,
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }
}

export async function addStamp(userId, locationId) {
  if (!db || !userId) {
    throw new Error('Database not available or user not authenticated');
  }

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  try {
    // Check if stamp already exists for this location
    const existingStamps = query(
      collection(db, 'stamps'),
      where('userId', '==', userId),
      where('locationId', '==', locationId)
    );

    const snapshot = await getDocs(existingStamps);
    if (!snapshot.empty) {
      throw new Error('You already have a stamp from this location!');
    }

    // Add new stamp
    const stampData = {
      userId,
      locationId,
      timestamp: new Date(),
      locationName: getLocationName(locationId),
    };

    await addDoc(collection(db, 'stamps'), stampData);
    return stampData;
  } catch (error) {
    console.error('Error adding stamp:', error);
    throw error;
  }
}

export async function getUserStamps(userId) {
  if (!db || !userId) {
    stamps.set([]);
    return [];
  }

  if (!isFirebaseConfigured()) {
    stamps.set([]);
    return [];
  }

  stampsLoading.set(true);

  try {
    // 단순한 쿼리로 변경 (인덱스 불필요)
    const stampsQuery = query(
      collection(db, 'stamps'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(stampsQuery);
    const userStamps = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
    }));

    // 클라이언트 사이드에서 정렬
    userStamps.sort((a, b) => b.timestamp - a.timestamp);

    stamps.set(userStamps);
    return userStamps;
  } catch (error) {
    console.error('Error fetching stamps:', error);
    stamps.set([]);
    return [];
  } finally {
    stampsLoading.set(false);
  }
}

// Mock location data - replace with your actual locations
function getLocationName(locationId) {
  const locations = {
    'welcome-stamp': '🎉 Welcome Stamp',
    'cafe-downtown': '☕ Downtown Café',
    'bookstore-main': '📚 Main Street Books',
    'restaurant-plaza': '🍕 Plaza Restaurant',
    'gym-fitness': '💪 Fitness Center',
    'park-central': '🌳 Central Park',
  };

  return locations[locationId] || `📍 Location ${locationId}`;
}
