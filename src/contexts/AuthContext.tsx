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

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => void; // Specifically Google login for now
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const initialAuthCheckDone = useRef(false); // To prevent welcome message on initial load if already signed in

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          avatarUrl: firebaseUser.photoURL,
        };
        // Only show welcome toast if it's a new login, not on initial page load with existing session
        // and user state actually changed from null to a user object.
        if (initialAuthCheckDone.current && !user && userProfile) {
          toast({ title: "Login Successful", description: "Welcome back!" });
        }
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
      if (!initialAuthCheckDone.current) {
        initialAuthCheckDone.current = true;
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast, user]); // add user to dependencies to correctly detect state change from null to user

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user & showing success toast
    } catch (error) {
      console.error("Error during Google login:", error);
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/popup-blocked') {
        toast({
          title: "Login Failed: Popup Blocked",
          description: "Your browser blocked the Google Sign-In popup. Please allow popups for this site and try again.",
          variant: "destructive",
          duration: 9000 // Longer duration for better readability
        });
      } else if (firebaseError.code === 'auth/cancelled-popup-request') {
        toast({
          title: "Login Cancelled",
          description: "The sign-in process was cancelled.",
          variant: "default", // Or "info" if you add such a variant
        });
      }
      else {
        toast({ 
          title: "Login Failed", 
          description: firebaseError.message || "An unknown error occurred.",
          variant: "destructive"
        });
      }
      setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false) is handled by onAuthStateChanged or error catch
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // onAuthStateChanged will handle setting user to null and setLoading(false)
    } catch (error) {
      console.error("Error during logout:", error);
      const firebaseError = error as { code?: string; message?: string };
      toast({ 
        title: "Logout Failed", 
        description: firebaseError.message || "An unknown error occurred.",
        variant: "destructive"
      });
      setLoading(false); // Ensure loading is false on error
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
