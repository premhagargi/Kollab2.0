
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
  const activeUserUID = useRef<string | null>(null); // To help manage toast for login

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
            // If profile exists, sync with latest from Auth provider & update timestamp
             userProfile = await createUserProfile({ 
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          }

          // console.log("User profile from Firestore:", userProfile);
          
          // Show "Login Successful" only if this is a new login session for this user
          if (initialAuthCheckDone.current && activeUserUID.current !== firebaseUser.uid) {
             if (userProfile) { // ensure profile is available before toasting
                toast({ title: "Login Successful", description: "Welcome back!" });
             }
          }
          activeUserUID.current = firebaseUser.uid;
          setUser(userProfile);

        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          toast({ title: "Profile Error", description: "Could not load your user profile.", variant: "destructive"});
          setUser(null); 
        }
      } else {
        activeUserUID.current = null; // Clear active user on logout
        setUser(null);
      }
      setLoading(false);
      if (!initialAuthCheckDone.current) {
        initialAuthCheckDone.current = true;
      }
    });

    return () => unsubscribe();
  }, [toast]); // Removed 'user' from dependency array

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
    } finally {
        setLoading(false); // Ensure loading is set to false even if logout fails
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
