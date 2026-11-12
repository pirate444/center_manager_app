'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { seedData } from '@/lib/seed-data';
import {
  studentsStorage,
  classesStorage,
  teachersStorage,
  paymentsStorage,
  registrationRequestsStorage,
} from '@/lib/storage';
import { ClassItem, DayOfWeek, Payment } from '@/lib/types';
import styles from './Dashboard.module.css';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, isManagerOrAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // If student lands on admin dashboard, redirect to dedicated student-dashboard
  useEffect(() => {
    if (!authLoading && user?.role === 'student') {
      router.replace('/student-dashboard');
    }
  }, [authLoading, user, router]);

  // Admin stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeClasses: 0,
    todaySessions: 0,
    pendingPayments: 0,
    pendingRegistrations: 0,
  });
  const [todayClasses, setTodayClasses] = useState<(ClassItem & { teacherName: string })[]>([]);
  const [recentPayments, setRecentPayments] = useState<(Payment & { studentName: string })[]>([]);

  useEffect(() => {
    seedData();

    async function loadData() {
      if (user?.role === 'student') return;

      const students = await studentsStorage.getAll();
      const classes = await classesStorage.getAll();
      const teachers = await teachersStorage.getAll();
      const payments = await paymentsStorage.getAll();
      const registrations = await registrationRequestsStorage.getAll();

      const activeClassesList = classes.filter((c) => c.status === 'active');
      const pendingRegs = registrations.filter((r) => r.status === 'pending');
      const pendingPay = payments.filter((p) => p.status === 'pending');

      const now = new Date();
      const today = DAY_MAP[now.getDay()];

      const sessionsToday = activeClassesList.filter((c) =>
        c.schedule.some((s) => s.day === today)
      );

      setStats({
        totalStudents: students.length,
        activeClasses: activeClassesList.length,
        todaySessions: sessionsToday.length,
        pendingPayments: pendingPay.length,
        pendingRegistrations: pendingRegs.length,
      });

      const teacherMap = new Map(teachers.map((t) => [t.id, t]));
      const todayWithTeachers = sessionsToday.slice(0, 5).map((c) => {
        const teacher = teacherMap.get(c.teacherId);
        return {
          ...c,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
        };
      });
      setTodayClasses(todayWithTeachers);

      const studentMap = new Map(students.map((s) => [s.id, s]));
      const recent = payments.slice(0, 5).map((p) => {
        const student = studentMap.get(p.studentId);
        return {
          ...p,
          studentName: student ? `${student.firstName} ${student.lastName}` : '',
        };
      });
      setRecentPayments(recent);
    }

    loadData();
  }, [user]);

  if (!isManagerOrAdmin) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn">
      {/* Welcome Header */}
      <div className={styles.welcomeHeader}>
        <h1 className={styles.welcomeTitle}>
          {t('welcome_back')}{user ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className={styles.welcomeSubtitle}>{t('welcome_message')}</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-1`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.totalStudents}</div>
          <div className={styles.statLabel}>{t('total_students')}</div>
        </div>

        <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-2`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.activeClasses}</div>
          <div className={styles.statLabel}>{t('active_classes')}</div>
        </div>

        <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-3`}>
          <div className={styles.statIcon} style={{ color: '#f59e0b' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.todaySessions}</div>
          <div className={styles.statLabel}>{t('today_sessions')}</div>
        </div>

        <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-4`}>
          <div className={styles.statIcon} style={{ color: '#ef4444' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.pendingPayments}</div>
          <div className={styles.statLabel}>{t('pending_payments')}</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Today's Schedule */}
        <div className={`glass-card-static ${styles.scheduleSection}`}>
          <h2 className={styles.sectionTitle}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('today_schedule')}
          </h2>

          {todayClasses.length === 0 ? (
            <div className={styles.emptySchedule}>
              <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>{t('no_classes_today')}</p>
            </div>
          ) : (
            <div className={styles.scheduleList}>
              {todayClasses.map((cls) => {
                const todayDay = DAY_MAP[new Date().getDay()];
                const slot = cls.schedule.find((s) => s.day === todayDay);
                return (
                  <div key={cls.id} className={styles.scheduleItem}>
                    <div className={styles.scheduleColor} style={{ backgroundColor: cls.color }} />
                    <div className={styles.scheduleInfo}>
                      <div className={styles.scheduleName}>{cls.name}</div>
                      <div className={styles.scheduleMeta}>
                        <span>{cls.teacherName}</span>
                        <span>•</span>
                        <span>{cls.room}</span>
                      </div>
                    </div>
                    <div className={styles.scheduleTime}>
                      {slot ? `${slot.startTime} - ${slot.endTime}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className={`glass-card-static ${styles.quickActions}`}>
          <h2 className={styles.sectionTitle}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('quick_actions')}
          </h2>
          <div className={styles.actionsGrid}>
            <button className={styles.actionBtn} onClick={() => router.push('/students')}>
              <div className={styles.actionIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              {t('add_student')}
            </button>
            <button className={styles.actionBtn} onClick={() => router.push('/classes')}>
              <div className={styles.actionIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              {t('new_class')}
            </button>
            <button className={styles.actionBtn} onClick={() => router.push('/billing')}>
              <div className={styles.actionIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {t('record_payment')}
            </button>
            <button className={styles.actionBtn} onClick={() => router.push('/attendance')}>
              <div className={styles.actionIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {t('mark_attendance')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
