'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_NAMES_FR: Record<string, string> = {
  sunday: 'Dimanche',
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
};

const DAY_NAMES_EN: Record<string, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const { user, isManagerOrAdmin } = useAuth();
  const router = useRouter();
  const isStudent = user?.role === 'student';

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

  // Student specific data
  const [studentData, setStudentData] = useState<{
    nextSession: {
      className: string;
      subject: string;
      dayLabel: string;
      time: string;
      room: string;
      teacherName: string;
      isToday: boolean;
    } | null;
    latestFile: {
      fileName: string;
      className: string;
      uploadedAt: string;
      fileSize: string;
    } | null;
    payment: {
      status: 'paid' | 'pending' | 'overdue' | 'partial' | 'none';
      amount: number;
      month: string;
      dueDate?: string;
    } | null;
    loading: boolean;
  }>({
    nextSession: null,
    latestFile: null,
    payment: null,
    loading: true,
  });

  useEffect(() => {
    seedData();

    async function loadData() {
      const classes = await classesStorage.getAll();
      const teachers = await teachersStorage.getAll();
      const payments = await paymentsStorage.getAll();
      const teacherMap = new Map(teachers.map((t) => [t.id, t]));

      if (isStudent && user) {
        // 1. Calculate student enrolled classes
        const enrolledClasses = classes.filter(
          (c) =>
            c.status === 'active' &&
            c.enrolledStudentIds?.includes(user.studentId || '')
        );

        // 2. Calculate next session
        const now = new Date();
        const currentDayIndex = now.getDay();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;

        interface CandidateSession {
          className: string;
          subject: string;
          dayLabel: string;
          time: string;
          room: string;
          teacherName: string;
          isToday: boolean;
          daysDiff: number;
          startTime: string;
        }

        const candidates: CandidateSession[] = [];

        for (const cls of enrolledClasses) {
          const teacher = teacherMap.get(cls.teacherId);
          const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : '';

          for (const slot of cls.schedule || []) {
            const slotDayIndex = DAY_INDEX[slot.day];
            if (slotDayIndex === undefined) continue;

            let diff = (slotDayIndex - currentDayIndex + 7) % 7;
            if (diff === 0 && slot.startTime <= currentTimeStr) {
              diff = 7; // already passed today, next is next week
            }

            let dayLabel =
              language === 'fr'
                ? DAY_NAMES_FR[slot.day] || slot.day
                : DAY_NAMES_EN[slot.day] || slot.day;

            if (diff === 0) {
              dayLabel = language === 'fr' ? "Aujourd'hui" : 'Today';
            } else if (diff === 1) {
              dayLabel = language === 'fr' ? 'Demain' : 'Tomorrow';
            }

            candidates.push({
              className: cls.name,
              subject: cls.subject,
              dayLabel,
              time: `${slot.startTime} - ${slot.endTime}`,
              room: cls.room || 'Salle Principale',
              teacherName,
              isToday: diff === 0,
              daysDiff: diff,
              startTime: slot.startTime,
            });
          }
        }

        candidates.sort((a, b) => {
          if (a.daysDiff !== b.daysDiff) return a.daysDiff - b.daysDiff;
          return a.startTime.localeCompare(b.startTime);
        });

        const nextSession = candidates[0] || null;

        // 3. Find latest uploaded resource in student classes
        let latestFile: any = null;
        try {
          for (const cls of enrolledClasses) {
            const res = await fetch(`/api/resources?classId=${cls.id}`);
            if (res.ok) {
              const sections = await res.json();
              if (Array.isArray(sections)) {
                for (const sec of sections) {
                  for (const f of sec.files || []) {
                    if (
                      !latestFile ||
                      new Date(f.uploadedAt).getTime() > new Date(latestFile.uploadedAt).getTime()
                    ) {
                      latestFile = {
                        fileName: f.fileName,
                        className: cls.name,
                        uploadedAt: new Date(f.uploadedAt).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                          { month: 'short', day: 'numeric' }
                        ),
                        fileSize: f.fileSize
                          ? `${(f.fileSize / (1024 * 1024)).toFixed(1)} MB`
                          : 'PDF',
                      };
                    }
                  }
                }
              }
            }
          }
        } catch {
          // silently continue
        }

        // 4. Find payment status
        const studentPayments = payments
          .filter((p) => p.studentId === user.studentId)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const latestP = studentPayments[0] || null;
        const paymentInfo = latestP
          ? {
              status: latestP.status,
              amount: latestP.amount,
              month: latestP.month || new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' }),
              dueDate: latestP.dueDate,
            }
          : {
              status: 'paid' as const,
              amount: 0,
              month: new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' }),
            };

        setStudentData({
          nextSession,
          latestFile,
          payment: paymentInfo,
          loading: false,
        });
      } else {
        // Staff Dashboard data
        const students = await studentsStorage.getAll();
        const activeClasses = classes.filter((c) => c.status === 'active');
        const todayDay = DAY_MAP[new Date().getDay()];

        const todaySessions = activeClasses.filter((c) =>
          c.schedule.some((s) => s.day === todayDay)
        );

        const pending = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
        const pendingReg = (await registrationRequestsStorage.getAll()).filter(
          (r) => r.status === 'pending'
        );

        setStats({
          totalStudents: students.filter((s) => s.status === 'active').length,
          activeClasses: activeClasses.length,
          todaySessions: todaySessions.length,
          pendingPayments: pending.length,
          pendingRegistrations: pendingReg.length,
        });

        const todayWithTeachers = todaySessions.map((c) => {
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
    }

    loadData();
  }, [isStudent, user, language]);

  // ==================== STUDENT DASHBOARD VIEW ====================
  if (isStudent) {
    const { nextSession, latestFile, payment } = studentData;

    return (
      <div className="page-container animate-fadeIn">
        {/* Welcome Banner */}
        <div className={styles.welcomeHeader}>
          <h1 className={styles.welcomeTitle}>
            {language === 'fr' ? 'Bonjour' : 'Welcome back'}, {user?.firstName} 👋
          </h1>
          <p className={styles.welcomeSubtitle}>
            {language === 'fr'
              ? 'Voici un aperçu de vos cours, devoirs et prochaines séances.'
              : 'Here is your academic overview, next session, and center updates.'}
          </p>
        </div>

        {/* 3 Main Student Overview Cards */}
        <div className={styles.studentOverviewGrid}>
          {/* Card 1: Next Session */}
          <div className={`glass-card ${styles.studentCard} ${styles.studentCardSession} animate-fadeInUp stagger-1`}>
            <div>
              <div className={styles.studentCardHeader}>
                <span className={styles.studentCardTitle}>
                  {language === 'fr' ? 'Prochaine Séance' : 'Next Session'}
                </span>
                <div className={styles.studentCardIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div className={styles.studentCardMain}>
                {nextSession ? (
                  <>
                    <div className={styles.studentCardValue}>{nextSession.className}</div>
                    <div className={styles.studentCardMeta}>
                      <span style={{ color: nextSession.isToday ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {nextSession.dayLabel}
                      </span>
                      <span>•</span>
                      <span>{nextSession.time}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {nextSession.room} {nextSession.teacherName ? `• Prof. ${nextSession.teacherName}` : ''}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9375rem', padding: '0.5rem 0' }}>
                    {language === 'fr' ? 'Aucune séance programmée' : 'No upcoming session'}
                  </div>
                )}
              </div>
            </div>

            <Link href="/schedule" className={styles.studentCardBtn}>
              <span>{language === 'fr' ? 'Emploi du temps complet' : 'Full Timetable'}</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Card 2: Latest Resource / File */}
          <div className={`glass-card ${styles.studentCard} ${styles.studentCardResource} animate-fadeInUp stagger-2`}>
            <div>
              <div className={styles.studentCardHeader}>
                <span className={styles.studentCardTitle}>
                  {language === 'fr' ? 'Dernier Document' : 'Latest Resource'}
                </span>
                <div className={styles.studentCardIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>

              <div className={styles.studentCardMain}>
                {latestFile ? (
                  <>
                    <div className={styles.studentCardValue} style={{ fontSize: '1.15rem' }} title={latestFile.fileName}>
                      {latestFile.fileName.length > 25 ? latestFile.fileName.slice(0, 24) + '...' : latestFile.fileName}
                    </div>
                    <div className={styles.studentCardMeta}>
                      <span>{latestFile.className}</span>
                      <span>•</span>
                      <span>{latestFile.uploadedAt}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {latestFile.fileSize}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9375rem', padding: '0.5rem 0' }}>
                    {language === 'fr' ? 'Aucun fichier récent' : 'No recent documents'}
                  </div>
                )}
              </div>
            </div>

            <Link href="/resources" className={styles.studentCardBtn}>
              <span>{language === 'fr' ? 'Consulter les cours' : 'Open Resources'}</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Card 3: Payment Status */}
          <div className={`glass-card ${styles.studentCard} ${styles.studentCardPayment} animate-fadeInUp stagger-3`}>
            <div>
              <div className={styles.studentCardHeader}>
                <span className={styles.studentCardTitle}>
                  {language === 'fr' ? 'Statut Paiement' : 'Tuition & Payment'}
                </span>
                <div className={styles.studentCardIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>

              <div className={styles.studentCardMain}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                  {payment?.status === 'paid' ? (
                    <span className={`${styles.studentBadge} ${styles.badgePaid}`}>
                      ✓ {language === 'fr' ? 'À Jour / Payé' : 'Paid / Settled'}
                    </span>
                  ) : (
                    <span className={`${styles.studentBadge} ${styles.badgePending}`}>
                      ! {language === 'fr' ? 'Paiement en attente' : 'Payment Due'}
                    </span>
                  )}
                </div>
                <div className={styles.studentCardValue}>
                  {payment && payment.amount > 0 ? `${payment.amount} TND` : 'Mensualité en ordre'}
                </div>
                <div className={styles.studentCardMeta}>
                  <span>{payment?.month || 'Mois en cours'}</span>
                  {payment?.dueDate && (
                    <>
                      <span>•</span>
                      <span>Échéance: {new Date(payment.dueDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link href="/billing" className={styles.studentCardBtn}>
              <span>{language === 'fr' ? 'Historique des paiements' : 'View Billing'}</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Quick Access Shortcuts */}
        <div className="glass-card-static" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" fill="none" stroke="#06b6d4" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{language === 'fr' ? 'Accès Rapide' : 'Quick Access'}</span>
          </h2>

          <div className={styles.studentShortcutsGrid}>
            <Link href="/schedule" className={styles.studentShortcutBtn}>
              <div className={styles.studentShortcutIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <span className={styles.studentShortcutLabel}>{language === 'fr' ? 'Emploi du temps' : 'Schedule'}</span>
            </Link>

            <Link href="/resources" className={styles.studentShortcutBtn}>
              <div className={styles.studentShortcutIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <span className={styles.studentShortcutLabel}>{language === 'fr' ? 'Cours & Fichiers' : 'Resources'}</span>
            </Link>

            <Link href="/absence-journal" className={styles.studentShortcutBtn}>
              <div className={styles.studentShortcutIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <span className={styles.studentShortcutLabel}>{language === 'fr' ? "Journal d'absence" : 'Absence'}</span>
            </Link>

            <Link href="/billing" className={styles.studentShortcutBtn}>
              <div className={styles.studentShortcutIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className={styles.studentShortcutLabel}>{language === 'fr' ? 'Paiements' : 'Billing'}</span>
            </Link>

            <Link href="/messages" className={styles.studentShortcutBtn}>
              <div className={styles.studentShortcutIcon} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <span className={styles.studentShortcutLabel}>{language === 'fr' ? 'Messages' : 'Messages'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STAFF DASHBOARD VIEW ====================
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
