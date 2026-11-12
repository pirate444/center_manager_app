'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { seedData } from '@/lib/seed-data';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading, userRole } = useAuth();

  useEffect(() => {
    // Seed demo data on first visit
    seedData();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (userRole === 'student') {
          router.replace('/student-dashboard');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, router, userRole]);

  return (
    <div className="flex" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
    </div>
  );
}
