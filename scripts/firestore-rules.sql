-- Firestore Security Rules (paste this in Firebase Console)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own stamps
    match /stamps/{stampId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId &&
        // Prevent duplicate stamps for same location
        !exists(/databases/$(database)/documents/stamps/$(stampId)) &&
        // Validate required fields
        request.resource.data.keys().hasAll(['userId', 'locationId', 'timestamp', 'locationName']);
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
