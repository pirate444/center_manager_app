'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './TopBar.module.css';

interface TopBarProps {
  onMobileMenuToggle: () => void;
  title?: string;
}

export default function TopBar({ onMobileMenuToggle, title }: TopBarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        <button className={styles.menuBtn} onClick={onMobileMenuToggle} aria-label="Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className={styles.pageTitle}>{title || t('app.title') || 'Dashboard'}</h1>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.searchContainer}>
          <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={t('common.search') || 'Search...'} 
            className={styles.searchInput}
          />
        </div>

        <LanguageSwitcher />

        <button className={styles.iconBtn} aria-label="Notifications">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className={styles.badge}></span>
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={styles.profileBtn}>
              <div className={styles.avatar}>
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className={styles.userName}>{user.firstName} {user.lastName}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className={styles.iconBtn} 
              aria-label="Logout"
              title={t('logout') || 'Logout'}
              style={{ color: 'var(--error)' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
