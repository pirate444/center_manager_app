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
  attendanceStorage,
  paymentsStorage,
  registrationRequestsStorage,
} from '@/lib/storage';
import { ClassItem, Teacher, DayOfWeek, Payment } from '@/lib/types';
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
  const { user, isManagerOrAdmin } = useAuth();
  const router = useRouter();

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
      const students = await studentsStorage.getAll();
      const classes = await classesStorage.getAll();
      const teachers = await teachersStorage.getAll();
      const payments = await paymentsStorage.getAll();

      const activeClasses = classes.filter(c => c.status === 'active');
      const todayDay = DAY_MAP[new Date().getDay()];

      const todaySessions = activeClasses.filter(c =>
        c.schedule.some(s => s.day === todayDay)
      );

      const pending = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
      const pendingReg = (await registrationRequestsStorage.getAll()).filter(r => r.status === 'pending');

      setStats({
        totalStudents: students.filter(s => s.status === 'active').length,
        activeClasses: activeClasses.length,
        todaySessions: todaySessions.length,
        pendingPayments: pending.length,
        pendingRegistrations: pendingReg.length,
      });

      // Today's classes with teacher names
      const teacherMap = new Map(teachers.map(t => [t.id, t]));
      const todayWithTeachers = todaySessions.map(c => {
        const teacher = teacherMap.get(c.teacherId);
        return {
          ...c,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
        };
      });
      setTodayClasses(todayWithTeachers);

      // Recent payments
      const studentMap = new Map(students.map(s => [s.id, s]));
      const recent = payments.slice(0, 5).map(p => {
        const student = studentMap.get(p.studentId);
        return {
          ...p,
          studentName: student ? `${student.firstName} ${student.lastName}` : '',
        };
      });
      setRecentPayments(recent);
    }

    loadData();
  }, []);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.pendingRegistrations}</div>
          <div className={styles.statLabel}>{t('pending_registrations') || 'Pending Registrations'}</div>
        </div>

        <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-3`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.todaySessions}</div>
          <div className={styles.statLabel}>{t('today_sessions')}</div>
        </div>

        <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-4`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className={styles.statValue}>{stats.pendingPayments}</div>
          <div className={styles.statLabel}>{t('pending_payments')}</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        {/* Today's Schedule */}
        <div className={`glass-card-static ${styles.scheduleCard}`}>
          <h2 className={styles.sectionTitle}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('todays_schedule')}
          </h2>

          {todayClasses.length === 0 ? (
            <div className={styles.emptySchedule}>
              {t('no_sessions_today')}
            </div>
          ) : (
            <div className={styles.scheduleList}>
              {todayClasses.map((cls) => {
                const todayDay = DAY_MAP[new Date().getDay()];
                const slot = cls.schedule.find(s => s.day === todayDay);
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
            <button className={styles.actionBtn} onClick={() => router.push('/registration-requests')}>
              <div className={styles.actionIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              {t('review_registrations') || 'Review Registrations'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className={`glass-card-static ${styles.recentCard}`}>
        <h2 className={styles.sectionTitle}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('upcoming_payments')}
        </h2>
        <div className={styles.recentList}>
          {recentPayments.length === 0 ? (
            <div className={styles.emptySchedule}>{t('no_data')}</div>
          ) : (
            recentPayments.map((payment) => (
              <div key={payment.id} className={styles.recentItem}>
                <div
                  className={styles.recentDot}
                  style={{
                    backgroundColor:
                      payment.status === 'paid' ? '#10b981' :
                      payment.status === 'overdue' ? '#ef4444' : '#f59e0b',
                  }}
                />
                <div>
                  <div className={styles.recentText}>
                    <strong>{payment.studentName}</strong> — {payment.description}
                    {' '}
                    <span className={`badge badge-${
                      payment.status === 'paid' ? 'success' :
                      payment.status === 'overdue' ? 'error' : 'warning'
                    }`}>
                      {t(payment.status)}
                    </span>
                  </div>
                  <div className={styles.recentTime}>
                    {payment.amount} {t('dinar')} · {new Date(payment.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
