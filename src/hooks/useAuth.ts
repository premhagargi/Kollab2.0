// src/hooks/useAuth.ts
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // The login function is now loginWithGoogle
  // To maintain compatibility with AppHeader's existing login() call, 
  // we can rename it here or update AppHeader. Let's provide both for clarity.
  return { ...context, login: context.loginWithGoogle }; 
};
