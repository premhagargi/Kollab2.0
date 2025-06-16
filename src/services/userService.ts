
// src/services/userService.ts
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, documentId } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// --- Caching Logic ---
const userCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes for user profiles

function getCache<T>(key: string): T | undefined {
  const entry = userCache.get(key);
  if (entry && Date.now() < entry.expiry) {
    // console.log(`[UserCache HIT] Key: ${key}`);
    return entry.data as T;
  }
  // console.log(`[UserCache MISS or EXPIRED] Key: ${key}`);
  userCache.delete(key);
  return undefined;
}

function setCache(key: string, data: any) {
  // console.log(`[UserCache SET] Key: ${key}`);
  userCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function invalidateCache(key: string) {
  // console.log(`[UserCache INVALIDATE] Key: ${key}`);
  userCache.delete(key);
}
// --- End Caching Logic ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const cacheKey = `user_${userId}`;
  const cachedData = getCache<UserProfile | null>(cacheKey);
  if (cachedData !== undefined) return cachedData;

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const userProfile = {
        id: userId, name: data.name || null, email: data.email || null,
        avatarUrl: data.avatarUrl || null,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      } as UserProfile;
      setCache(cacheKey, userProfile);
      return userProfile;
    } else {
      setCache(cacheKey, null);
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error; 
  }
};

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
      await setDoc(userDocRef, { ...profileDataFromAuth, createdAt: now, updatedAt: now });
    } else {
      await setDoc(userDocRef, { ...profileDataFromAuth, updatedAt: now }, { merge: true }); 
    }
    
    invalidateCache(`user_${authUser.uid}`); // Invalidate after update
    const newDocSnap = await getDoc(userDocRef); // Re-fetch for consistent data
    if (!newDocSnap.exists()) throw new Error("Failed to retrieve user profile after creation/update.");
    
    const newProfileData = newDocSnap.data();
    const userProfile = {
      id: authUser.uid, name: newProfileData.name, email: newProfileData.email,
      avatarUrl: newProfileData.avatarUrl,
      createdAt: newProfileData.createdAt instanceof Timestamp ? newProfileData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: newProfileData.updatedAt instanceof Timestamp ? newProfileData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };
    setCache(`user_${authUser.uid}`, userProfile); // Update cache with fresh data
    return userProfile;
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    throw error;
  }
};

export const getUsersByIds = async (userIds: string[]): Promise<UserProfile[]> => {
  if (!userIds || userIds.length === 0) return [];
  const uniqueUserIds = [...new Set(userIds)].filter(id => id);
  if (uniqueUserIds.length === 0) return [];

  const profilesFromCache: UserProfile[] = [];
  const idsToFetch: string[] = [];

  for (const userId of uniqueUserIds) {
    const cachedProfile = getCache<UserProfile | null>(`user_${userId}`);
    if (cachedProfile) {
      profilesFromCache.push(cachedProfile);
    } else if (cachedProfile === undefined) { // Not in cache or expired
      idsToFetch.push(userId);
    }
    // If cachedProfile is null, it means we know it doesn't exist, so skip.
  }

  if (idsToFetch.length === 0) return profilesFromCache;

  const fetchedProfiles: UserProfile[] = [];
  const BATCH_SIZE = 30;
  const usersCollectionRef = collection(db, USERS_COLLECTION);

  for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
    const batchIds = idsToFetch.slice(i, i + BATCH_SIZE);
    if (batchIds.length === 0) continue;
    try {
      const q = query(usersCollectionRef, where(documentId(), 'in', batchIds));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const profile = {
            id: docSnap.id, name: data.name || null, email: data.email || null,
            avatarUrl: data.avatarUrl || null,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
          } as UserProfile;
          fetchedProfiles.push(profile);
          setCache(`user_${docSnap.id}`, profile); // Add fetched profile to cache
        } else {
           setCache(`user_${docSnap.id}`, null); // Cache as null if not found
        }
      });
    } catch (error) {
      console.error("Error fetching users by IDs (batch):", error);
    }
  }
  return [...profilesFromCache, ...fetchedProfiles];
};
