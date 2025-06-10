
// src/services/userService.ts
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, documentId } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

/**
 * Retrieves a user profile from Firestore.
 * @param userId The UID of the user.
 * @returns The user profile if found, otherwise null.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        id: userId,
        name: data.name || null,
        email: data.email || null,
        avatarUrl: data.avatarUrl || null,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      } as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error; 
  }
};

/**
 * Creates a new user profile in Firestore or updates an existing one.
 * Uses information from the Firebase Auth user object.
 * @param authUser The Firebase Auth user object containing uid, email, displayName, and photoURL.
 * @returns The created or updated user profile.
 */
export const createUserProfile = async (
  authUser: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }
): Promise<UserProfile> => {
  const userDocRef = doc(db, USERS_COLLECTION, authUser.uid);

  const profileDataFromAuth = {
    email: authUser.email || null,
    name: authUser.displayName || authUser.email?.split('@')[0] || 'Anonymous User',
    avatarUrl: authUser.photoURL || `https://placehold.co/100x100.png?text=${(authUser.displayName || authUser.email || 'A').charAt(0).toUpperCase()}`,
  };

  try {
    const docSnap = await getDoc(userDocRef);
    const now = serverTimestamp();

    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        ...profileDataFromAuth,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await setDoc(userDocRef, {
        ...profileDataFromAuth, 
        updatedAt: now,
      }, { merge: true }); 
    }
    
    const newDocSnap = await getDoc(userDocRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to retrieve user profile after creation/update.");
    }
    const newProfileData = newDocSnap.data();

    return {
      id: authUser.uid,
      name: newProfileData.name,
      email: newProfileData.email,
      avatarUrl: newProfileData.avatarUrl,
      createdAt: newProfileData.createdAt instanceof Timestamp ? newProfileData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: newProfileData.updatedAt instanceof Timestamp ? newProfileData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };

  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    throw error;
  }
};

/**
 * Fetches multiple user profiles by their IDs.
 * @param userIds An array of user UIDs.
 * @returns A promise that resolves to an array of UserProfile objects.
 */
export const getUsersByIds = async (userIds: string[]): Promise<UserProfile[]> => {
  if (!userIds || userIds.length === 0) {
    return [];
  }
  const uniqueUserIds = [...new Set(userIds)].filter(id => id); // Ensure unique and non-empty IDs
  if (uniqueUserIds.length === 0) return [];

  const BATCH_SIZE = 30; // Firestore 'in' query limit
  const userProfiles: UserProfile[] = [];
  const usersCollectionRef = collection(db, USERS_COLLECTION);

  for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
    const batchIds = uniqueUserIds.slice(i, i + BATCH_SIZE);
    if (batchIds.length === 0) continue;

    try {
      const q = query(usersCollectionRef, where(documentId(), 'in', batchIds));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          userProfiles.push({
            id: docSnap.id,
            name: data.name || null,
            email: data.email || null,
            avatarUrl: data.avatarUrl || null,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
          } as UserProfile);
        }
      });
    } catch (error) {
      console.error("Error fetching users by IDs (batch):", error);
      // Optionally, collect errors or rethrow, for now, we continue
    }
  }
  return userProfiles;
};

    