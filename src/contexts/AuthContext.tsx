
// src/contexts/AuthContext.tsx
"use client";

import type { UserProfile } from '@/types';
import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, createUserProfile } from '@/services/userService'; 

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<void>; 
  signupWithEmailAndPassword: (email: string, password: string) => Promise<void>; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const initialAuthCheckDone = useRef(false);
  const activeUserUID = useRef<string | null>(null); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setLoading(true); 
        try {
          let userProfile = await getUserProfile(firebaseUser.uid);
          
          if (!userProfile) {
            userProfile = await createUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
            // Toast for profile creation can be shown here if desired, or handled by signup function
          } else {
            // Optionally sync if provider data is newer (e.g. display name changed in Google)
             userProfile = await createUserProfile({ 
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          }
          
          if (initialAuthCheckDone.current && activeUserUID.current !== firebaseUser.uid) {
             if (userProfile) { 
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
        if (activeUserUID.current && initialAuthCheckDone.current) { // User was logged in and is now logged out
           toast({ title: "Logged Out", description: "You have been successfully logged out." });
        }
        activeUserUID.current = null; 
        setUser(null);
      }
      setLoading(false);
      if (!initialAuthCheckDone.current) {
        initialAuthCheckDone.current = true;
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged handles success
    } catch (error) {
      console.error("Error during Google login:", error);
      const firebaseError = error as AuthError;
      let description = "An unknown error occurred during Google login.";
      if (firebaseError.code === 'auth/popup-blocked') {
        description = "Your browser blocked the Google Sign-In popup. Please allow popups and try again.";
      } else if (firebaseError.code === 'auth/cancelled-popup-request' || firebaseError.code === 'auth/popup-closed-by-user') {
        description = "The sign-in process was cancelled.";
      } else if (firebaseError.code === 'auth/unauthorized-domain') {
        description = "This domain is not authorized for authentication. Please contact support.";
      } else if (firebaseError.message) {
        description = firebaseError.message;
      }
      toast({ title: "Google Login Failed", description, variant: "destructive" });
      setLoading(false); // Ensure loading is false on error
      throw error; // Re-throw to allow form to handle its own state if needed
    }
    // setLoading(false) is handled by onAuthStateChanged
  };
  
  const logout = async () => {
    // setLoading(true); // setLoading is handled by onAuthStateChanged
    try {
      await signOut(auth);
      // Toast for logout is handled by onAuthStateChanged when user becomes null
    } catch (error) {
      console.error("Error during logout:", error);
      const firebaseError = error as AuthError;
      toast({ 
        title: "Logout Failed", 
        description: firebaseError.message || "An unknown error occurred.",
        variant: "destructive"
      });
      // setLoading(false); // Not strictly needed here as onAuthStateChanged will trigger
    }
  };

  const loginWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged handles success and toast
    } catch (error) {
      console.error("Error during email/password login:", error);
      const firebaseError = error as AuthError;
      let description = "An unknown error occurred.";
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential': // Covers wrong password and user not found for newer SDKs
          description = "Invalid email or password. Please try again.";
          break;
        case 'auth/wrong-password': // Older SDKs might still use this
          description = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-email':
          description = "The email address is not valid.";
          break;
        case 'auth/user-disabled':
          description = "This user account has been disabled.";
          break;
        default:
          description = firebaseError.message || description;
      }
      toast({ title: "Login Failed", description, variant: "destructive" });
      setLoading(false);
      throw error; // Re-throw to allow form to handle its own state
    }
    // setLoading(false) handled by onAuthStateChanged
  };

  const signupWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const userCredential = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
      // Create user profile immediately after Firebase Auth user creation
      // onAuthStateChanged will also fire, but this ensures profile exists before first "Login Successful" toast from onAuthStateChanged
      if (userCredential.user) {
         await createUserProfile({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName, // Will be null for email/pass signup initially
            photoURL: userCredential.user.photoURL,
          });
        toast({ title: "Signup Successful", description: "Your account has been created. Welcome!" });
      }
      // onAuthStateChanged will then set the user and potentially show a "Login Successful"
    } catch (error) {
      console.error("Error during email/password signup:", error);
      const firebaseError = error as AuthError;
      let description = "An unknown error occurred during signup.";
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          description = "This email address is already in use. Please try logging in.";
          break;
        case 'auth/invalid-email':
          description = "The email address is not valid.";
          break;
        case 'auth/weak-password':
          description = "The password is too weak. Please choose a stronger password.";
          break;
        default:
          description = firebaseError.message || description;
      }
      toast({ title: "Signup Failed", description, variant: "destructive" });
      setLoading(false);
      throw error; // Re-throw to allow form to handle its own state
    }
     // setLoading(false) handled by onAuthStateChanged
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, loginWithEmailAndPassword, signupWithEmailAndPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
