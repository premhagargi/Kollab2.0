
// src/services/userService.ts
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
 * @param authUser The Firebase Auth user object containing uid, email, displayName, and photoURL.
 * @returns The created or updated user profile.
 */
export const createUserProfile = async (
  authUser: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }
): Promise<UserProfile> => {
  const userDocRef = doc(db, USERS_COLLECTION, authUser.uid);

  // Prepare base profile data from authUser
  const profileDataFromAuth = {
    email: authUser.email || null,
    name: authUser.displayName || authUser.email?.split('@')[0] || 'Anonymous User',
    avatarUrl: authUser.photoURL || `https://placehold.co/100x100.png?text=${(authUser.displayName || authUser.email || 'A').charAt(0).toUpperCase()}`,
  };

  try {
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // Document doesn't exist, create it with createdAt and updatedAt
      await setDoc(userDocRef, {
        ...profileDataFromAuth,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Document exists, update it with updatedAt and potentially sync auth info
      await setDoc(userDocRef, {
        ...profileDataFromAuth, // Re-sync name, email, avatar from provider
        updatedAt: serverTimestamp(),
      }, { merge: true }); // Merge true to preserve createdAt and other existing fields
    }
    
    // Fetch the newly created/updated document to get server-generated timestamps
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

