
// src/contexts/AuthContext.tsx
"use client";

import type { UserProfile } from '@/types';
import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import auth from your Firebase config
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, createUserProfile } from '@/services/userService'; // Import user service

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const initialAuthCheckDone = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setLoading(true); // Set loading while we fetch/create profile
        try {
          let userProfile = await getUserProfile(firebaseUser.uid);
          
          if (!userProfile) {
            // User exists in Auth, but not in Firestore. Create profile.
            // console.log(`No Firestore profile for ${firebaseUser.uid}, creating one...`);
            userProfile = await createUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
             toast({ title: "Profile Created", description: "Your user profile has been set up." });
          } else {
            // If profile exists, potentially update it with latest from Auth provider (e.g., new photoURL)
            // This is a simple update, more sophisticated merging might be needed in complex scenarios.
             userProfile = await createUserProfile({ // Re-call to ensure latest info is synced & updatedAt is touched
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          }

          // console.log("User profile from Firestore:", userProfile);

          if (initialAuthCheckDone.current && !user && userProfile) {
            toast({ title: "Login Successful", description: "Welcome back!" });
          }
          setUser(userProfile);

        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          toast({ title: "Profile Error", description: "Could not load your user profile.", variant: "destructive"});
          setUser(null); // Fallback: user is authenticated but profile ops failed.
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      if (!initialAuthCheckDone.current) {
        initialAuthCheckDone.current = true;
      }
    });

    return () => unsubscribe();
  }, [toast, user]); // Added user to dependency array

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle fetching/creating profile and setting user state
    } catch (error) {
      console.error("Error during Google login:", error);
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/popup-blocked') {
        toast({
          title: "Login Failed: Popup Blocked",
          description: "Your browser blocked the Google Sign-In popup. Please allow popups and try again.",
          variant: "destructive",
          duration: 9000
        });
      } else if (firebaseError.code === 'auth/cancelled-popup-request') {
        toast({
          title: "Login Cancelled",
          description: "The sign-in process was cancelled.",
        });
      } else if (firebaseError.code === 'auth/unauthorized-domain') {
         toast({
          title: "Login Failed: Unauthorized Domain",
          description: "This domain is not authorized for authentication. Please contact support.",
          variant: "destructive",
        });
      }
      else {
        toast({ 
          title: "Login Failed", 
          description: firebaseError.message || "An unknown error occurred during login.",
          variant: "destructive"
        });
      }
      setLoading(false); 
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      console.error("Error during logout:", error);
      const firebaseError = error as { code?: string; message?: string };
      toast({ 
        title: "Logout Failed", 
        description: firebaseError.message || "An unknown error occurred.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
