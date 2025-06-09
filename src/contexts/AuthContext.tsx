// src/contexts/AuthContext.tsx
"use client";

import type { UserProfile } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          avatarUrl: firebaseUser.photoURL,
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user
      toast({ title: "Login Successful", description: "Welcome back!" });
    } catch (error) {
      console.error("Error during Google login:", error);
      const firebaseError = error as { code?: string; message?: string };
      toast({ 
        title: "Login Failed", 
        description: firebaseError.message || "An unknown error occurred.",
        variant: "destructive"
      });
      setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false) is handled by onAuthStateChanged or error catch
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
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
     // setLoading(false) is handled by onAuthStateChanged or error catch
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
