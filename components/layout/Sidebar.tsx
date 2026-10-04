'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  
  const { userRole, isSuperAdmin } = useAuth();
  const { notifications } = useNotifications();

  const routes = [
    { path: '/dashboard', label: t('dashboard') || 'Dashboard', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>, roles: ['super_admin', 'center_manager'] },
    { path: '/students', label: t('nav.students') || 'Students', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, roles: ['super_admin', 'center_manager'] },
    { path: '/teachers', label: t('nav.teachers') || 'Teachers', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, roles: ['super_admin', 'center_manager'] },
    { path: '/classes', label: t('nav.classes') || 'Classes', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, roles: ['super_admin', 'center_manager', 'teacher'] },
    { path: '/schedule', label: t('nav.schedule') || 'Schedule', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, roles: ['super_admin', 'center_manager', 'teacher', 'student'] },
    { path: '/attendance', label: t('nav.attendance') || 'Attendance', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, roles: ['super_admin', 'center_manager', 'teacher'] },
    { path: '/absence-journal', label: t('absence_journal') || 'Absence Journal', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, roles: ['super_admin', 'center_manager', 'teacher', 'student'] },
    { path: '/resources', label: t('nav.resources') || 'Resources', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3v5a2 2 0 002 2h4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6-4h6" /></svg>, roles: ['super_admin', 'center_manager', 'teacher', 'student'] },
    { path: '/billing', label: t('nav.billing') || 'Billing', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>, roles: ['super_admin', 'center_manager', 'student'] },
    { path: '/reports', label: t('nav.reports') || 'Reports', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, roles: ['super_admin'] },
    { path: '/messages', label: t('nav.messages') || 'Messages', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>, roles: ['super_admin', 'center_manager', 'teacher', 'student'] },
    { path: '/registration-requests', label: t('registration_requests') || 'Registrations', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, roles: ['super_admin', 'center_manager'] },
    { path: '/settings', label: t('nav.settings') || 'Settings', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, roles: ['super_admin', 'center_manager', 'teacher', 'student'] },
    { path: '/admin/users', label: t('user_management') || 'Users', icon: <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, roles: ['super_admin'] },
  ];

  const visibleRoutes = routes.filter(route => {
    if (!userRole) return false;
    return route.roles.includes(userRole);
  });

  const sidebarClass = `${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded} ${isMobileOpen ? styles.mobileOpen : styles.mobileHidden}`;

  return (
    <>
      {isMobileOpen && <div className={styles.overlay} onClick={onMobileClose} />}
      <aside className={sidebarClass}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo} onClick={() => isMobileOpen && onMobileClose()}>
            <div className={styles.logoIcon}>E</div>
            {!collapsed && <span>{t('app.title') || 'EduCenter'}</span>}
          </Link>
          <button className={`${styles.toggleBtn} ${styles.desktopOnly}`} onClick={onToggle} title="Toggle Sidebar">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className={styles.nav}>
          {visibleRoutes.map((route) => {
            const isActive = pathname === route.path || (route.path !== '/' && pathname.startsWith(route.path));
            
            // Check if this route has a notification
            let hasNotification = false;
            if (route.path.includes('/messages') && notifications.messages) hasNotification = true;
            if (route.path.includes('/resources') && notifications.resources) hasNotification = true;
            if (route.path.includes('/schedule') && notifications.schedule) hasNotification = true;

            return (
              <Link
                key={route.path}
                href={route.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={collapsed ? route.label : ''}
                onClick={() => isMobileOpen && onMobileClose()}
              >
                <div style={{ position: 'relative', display: 'flex' }}>
                  {route.icon}
                  {hasNotification && (
                    <span className={styles.notificationDot}></span>
                  )}
                </div>
                {!collapsed && <span>{route.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
