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
  const { t, language } = useTranslation();
  const { user, isManagerOrAdmin, isTeacher, loading: authLoading } = useAuth();
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

  // Teacher specific state
  const [teacherClasses, setTeacherClasses] = useState<ClassItem[]>([]);
  const [teacherStudentsCount, setTeacherStudentsCount] = useState(0);
  const [teacherTodaySessions, setTeacherTodaySessions] = useState<(ClassItem & { todaySlot?: { startTime: string; endTime: string; room?: string } })[]>([]);
  const [teacherQuizzesCount, setTeacherQuizzesCount] = useState(0);

  useEffect(() => {
    seedData();

    async function loadData() {
      if (user?.role === 'student') return;

      const [students, classes, teachers, payments, registrations] = await Promise.all([
        studentsStorage.getAll(),
        classesStorage.getAll(),
        teachersStorage.getAll(),
        paymentsStorage.getAll(),
        registrationRequestsStorage.getAll(),
      ]);

      const activeClassesList = classes.filter((c) => c.status === 'active');
      const now = new Date();
      const today = DAY_MAP[now.getDay()];

      if (isTeacher && user?.teacherId) {
        // Teacher specific scoping
        let assignedClassIds = new Set<string>();
        const teacherRecord = teachers.find(t => t.id === user.teacherId);
        if (teacherRecord?.assignedClassIds) {
          assignedClassIds = new Set(teacherRecord.assignedClassIds);
        }

        const myClasses = activeClassesList.filter(
          (c) => c.teacherId === user.teacherId || assignedClassIds.has(c.id)
        );
        setTeacherClasses(myClasses);

        // Calculate unique enrolled students across teacher's classes
        const enrolledStudentIdSet = new Set<string>();
        myClasses.forEach((c) => {
          c.enrolledStudentIds?.forEach((id) => enrolledStudentIdSet.add(String(id)));
        });
        setTeacherStudentsCount(enrolledStudentIdSet.size);

        // Calculate sessions today for teacher
        const mySessionsToday = myClasses
          .filter((c) => c.schedule?.some((s) => s.day === today))
          .map((c) => ({
            ...c,
            todaySlot: c.schedule?.find((s) => s.day === today),
          }));
        setTeacherTodaySessions(mySessionsToday);

        // Fetch teacher's quizzes count
        try {
          const qRes = await fetch('/api/quizzes');
          if (qRes.ok) {
            const allQ = await qRes.json();
            const myClassIds = new Set(myClasses.map((c) => String(c.id)));
            const myQ = allQ.filter(
              (q: any) => q.teacherId === user.teacherId || myClassIds.has(String(q.classId))
            );
            setTeacherQuizzesCount(myQ.length);
          }
        } catch {}
      } else if (isManagerOrAdmin) {
        // Admin / Manager stats
        const pendingRegs = registrations.filter((r) => r.status === 'pending');
        const pendingPay = payments.filter((p) => p.status === 'pending');

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
    }

    loadData();
  }, [user, isTeacher, isManagerOrAdmin]);

  if (!isManagerOrAdmin && !isTeacher) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // ================= TEACHER DASHBOARD VIEW =================
  if (isTeacher) {
    return (
      <div className="page-container animate-fadeIn">
        {/* Welcome Header */}
        <div className={styles.welcomeHeader}>
          <h1 className={styles.welcomeTitle}>
            {t('welcome_back')}{user ? `, ${user.firstName}` : ''} 👋
          </h1>
          <p className={styles.welcomeSubtitle}>
            {language === 'fr'
              ? 'Voici un aperçu de vos cours, de vos élèves et de vos activités aujourd’hui.'
              : 'Here is an overview of your classes, students, and sessions today.'}
          </p>
        </div>

        {/* Teacher Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-1`}>
            <div className={styles.statIcon}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className={styles.statValue}>{teacherStudentsCount}</div>
            <div className={styles.statLabel}>{t('my_students') || 'Mes Étudiants'}</div>
          </div>

          <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-2`}>
            <div className={styles.statIcon}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className={styles.statValue}>{teacherClasses.length}</div>
            <div className={styles.statLabel}>{t('my_classes') || 'Mes Classes'}</div>
          </div>

          <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-3`}>
            <div className={styles.statIcon} style={{ color: '#f59e0b' }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className={styles.statValue}>{teacherTodaySessions.length}</div>
            <div className={styles.statLabel}>{t('today_sessions') || 'Séances aujourd’hui'}</div>
          </div>

          <div className={`glass-card ${styles.statCard} animate-fadeInUp stagger-4`}>
            <div className={styles.statIcon} style={{ color: '#10b981' }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className={styles.statValue}>{teacherQuizzesCount}</div>
            <div className={styles.statLabel}>{t('active_quizzes') || 'Quiz Interactifs'}</div>
          </div>
        </div>

        {/* Teacher Content Grid */}
        <div className={styles.contentGrid}>
          {/* Today's Schedule */}
          <div className={`glass-card-static ${styles.scheduleSection}`}>
            <h2 className={styles.sectionTitle}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('today_schedule') || 'Programme d’aujourd’hui'}
            </h2>

            {teacherTodaySessions.length === 0 ? (
              <div className={styles.emptySchedule}>
                <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>{t('no_classes_today') || 'Aucun cours prévu aujourd’hui.'}</p>
              </div>
            ) : (
              <div className={styles.scheduleList}>
                {teacherTodaySessions.map((cls) => {
                  const slot = cls.todaySlot;
                  return (
                    <div key={cls.id} className={styles.scheduleItem}>
                      <div className={styles.scheduleColor} style={{ backgroundColor: cls.color || 'var(--accent-teal)' }} />
                      <div className={styles.scheduleInfo}>
                        <div className={styles.scheduleName}>{cls.name}</div>
                        <div className={styles.scheduleMeta}>
                          <span>{cls.subject}</span>
                          <span>•</span>
                          <span>{slot?.room || cls.room}</span>
                          <span>•</span>
                          <span>{cls.enrolledStudentIds?.length || 0} {t('students') || 'élèves'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={styles.scheduleTime}>
                          {slot ? `${slot.startTime} - ${slot.endTime}` : ''}
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => router.push(`/attendance?classId=${cls.id}`)}
                        >
                          {t('mark_attendance_action') || 'Faire l’appel'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teacher Quick Actions */}
          <div className={`glass-card-static ${styles.quickActions}`}>
            <h2 className={styles.sectionTitle}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('quick_actions')}
            </h2>
            <div className={styles.actionsGrid}>
              <button className={styles.actionBtn} onClick={() => router.push('/attendance')}>
                <div className={styles.actionIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {t('mark_attendance')}
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/quizzes')}>
                <div className={styles.actionIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                {t('create_quiz') || 'Créer un quiz'}
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/resources')}>
                <div className={styles.actionIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                {t('nav.resources') || 'Ressources'}
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/absence-journal')}>
                <div className={styles.actionIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                {t('absence_journal') || 'Journal d’absence'}
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/schedule')}>
                <div className={styles.actionIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {t('my_schedule') || 'Mon Planning'}
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/messages')}>
                <div className={styles.actionIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                {t('nav.messages') || 'Messages'}
              </button>
            </div>
          </div>
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
