
// src/services/userService.ts
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
      // Combine Firestore data with the essential id
      const data = userDocSnap.data();
      return {
        id: userId, // Ensure id is always present
        name: data.name || null,
        email: data.email || null,
        avatarUrl: data.avatarUrl || null,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        ...data, // Spread the rest of the data
      } as UserProfile;
    } else {
      // console.log(`No user profile found for ${userId}`);
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Creates a new user profile in Firestore or updates an existing one.
 * Uses information from the Firebase Auth user object.
 * @param authUser The Firebase Auth user object.
 * @returns The created or updated user profile.
 */
export const createUserProfile = async (
  authUser: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }
): Promise<UserProfile> => {
  const userDocRef = doc(db, USERS_COLLECTION, authUser.uid);

  const userProfileData: Partial<UserProfile> = {
    id: authUser.uid,
    email: authUser.email || null,
    name: authUser.displayName || authUser.email?.split('@')[0] || 'Anonymous User', // Fallback name
    avatarUrl: authUser.photoURL || `https://placehold.co/100x100.png?text=${(authUser.displayName || authUser.email || 'A').charAt(0)}`, // Fallback avatar
    // We use serverTimestamp for createdAt and updatedAt on initial creation
  };

  try {
    // Check if document exists to determine if we should set createdAt
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        ...userProfileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // If user logs in again and profile exists, just update 'updatedAt' and potentially other info if needed.
      // For now, let's assume we just ensure the profile exists. We can expand this to merge/update fields if authUser has newer info.
      await setDoc(userDocRef, {
        updatedAt: serverTimestamp(),
        // Optionally re-sync basic info if it might change from provider
        email: authUser.email || docSnap.data()?.email || null,
        name: authUser.displayName || docSnap.data()?.name || authUser.email?.split('@')[0] || 'Anonymous User',
        avatarUrl: authUser.photoURL || docSnap.data()?.avatarUrl || `https://placehold.co/100x100.png?text=${(authUser.displayName || authUser.email || 'A').charAt(0)}`,
      }, { merge: true }); // Merge to avoid overwriting other fields
    }
    
    // Fetch the newly created/updated document to get server-generated timestamps
    const newDocSnap = await getDoc(userDocRef);
    const newProfileData = newDocSnap.data();

    return {
      id: authUser.uid,
      name: newProfileData?.name || null,
      email: newProfileData?.email || null,
      avatarUrl: newProfileData?.avatarUrl || null,
      createdAt: newProfileData?.createdAt?.toDate().toISOString() || new Date().toISOString(),
      updatedAt: newProfileData?.updatedAt?.toDate().toISOString() || new Date().toISOString(),
    };

  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};
