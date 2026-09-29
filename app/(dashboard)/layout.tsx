'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (userRole === 'student' && pathname === '/dashboard') {
        router.push('/schedule');
      }
    }
  }, [isAuthenticated, loading, router, userRole, pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex" style={{ height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-dark)' }}>
      <Sidebar 
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      
      <div className={`main-content ${collapsed ? 'main-content-collapsed' : 'main-content-expanded'}`}>
        <TopBar 
          onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)} 
        />
        
        <main style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
