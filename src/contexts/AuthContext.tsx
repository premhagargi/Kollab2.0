// src/contexts/AuthContext.tsx
"use client";

import type { UserProfile } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { mockUser } from '@/lib/mock-data';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking auth state
    const storedUser = localStorage.getItem('teamflow-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('teamflow-user', JSON.stringify(mockUser));
      setUser(mockUser);
      setLoading(false);
    }, 500);
  };

  const logout = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      localStorage.removeItem('teamflow-user');
      setUser(null);
      setLoading(false);
    }, 500);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
