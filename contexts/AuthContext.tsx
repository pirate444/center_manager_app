'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import User type from @/lib/types
import { User, UserRole } from '@/lib/types';
import { usersStorage, getWeeklyLoginCode, hashPassword } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isCenterManager: boolean;
  isManagerOrAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  userRole: UserRole | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Backward compatibility for old sessions before role system update
        if (parsed.role === 'admin') {
          parsed.role = 'super_admin';
          localStorage.setItem('auth_user', JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch {
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  // Staff login (email + password) — for super_admin, center_manager, teacher
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const users: User[] = await usersStorage.getAll();
      const hashedInput = await hashPassword(password);
      const foundUser = users.find(u => u.email === email && (u.password === hashedInput || u.password === password));
      
      if (!foundUser) return { success: false, error: 'invalid_credentials' };
      if (!foundUser.isActive) return { success: false, error: 'account_disabled' };
      if (foundUser.role === 'student') return { success: false, error: 'use_code_login' };
      
      setUser(foundUser);
      localStorage.setItem('auth_user', JSON.stringify(foundUser));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'no_users' };
    }
  };

  // Student login (secret code)
  const loginWithCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const users: User[] = await usersStorage.getAll();
      const foundUser = users.find(u => 
        u.role === 'student' && 
        (u.loginCode === code || getWeeklyLoginCode(u.id) === code)
      );
      
      if (!foundUser) return { success: false, error: 'invalid_code' };
      if (!foundUser.isActive) return { success: false, error: 'account_disabled' };
      
      setUser(foundUser);
      localStorage.setItem('auth_user', JSON.stringify(foundUser));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'no_users' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const role = user?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSuperAdmin: role === 'super_admin',
      isCenterManager: role === 'center_manager',
      isManagerOrAdmin: role === 'super_admin' || role === 'center_manager',
      isTeacher: role === 'teacher',
      isStudent: role === 'student',
      userRole: role,
      login,
      loginWithCode,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
