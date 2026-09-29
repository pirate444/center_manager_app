'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { classesStorage, studentsStorage, attendanceStorage } from '@/lib/storage';
import { ClassItem, Student, AttendanceRecord } from '@/lib/types';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import styles from './AbsenceJournal.module.css';

const MONTH_KEYS = [
  'month_january', 'month_february', 'month_march', 'month_april',
  'month_may', 'month_june', 'month_july', 'month_august',
  'month_september', 'month_october', 'month_november', 'month_december',
];

const SHORT_DAY_KEYS: Record<string, { ar: string; fr: string; en: string }> = {
  '0': { ar: 'أح', fr: 'Di', en: 'Su' },
  '1': { ar: 'إث', fr: 'Lu', en: 'Mo' },
  '2': { ar: 'ثل', fr: 'Ma', en: 'Tu' },
  '3': { ar: 'أر', fr: 'Me', en: 'We' },
  '4': { ar: 'خم', fr: 'Je', en: 'Th' },
  '5': { ar: 'جم', fr: 'Ve', en: 'Fr' },
  '6': { ar: 'سب', fr: 'Sa', en: 'Sa' },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function AbsenceJournalPage() {
  const { t, language } = useTranslation();
  const { user, isStudent, isTeacher, isManagerOrAdmin } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const classIdParam = params.get('classId');
      const monthParam = params.get('month');
      if (classIdParam) setSelectedClassId(classIdParam);
      if (monthParam) {
        const [y, m] = monthParam.split('-');
        if (y && m) {
          setSelectedYear(parseInt(y, 10));
          setSelectedMonth(parseInt(m, 10) - 1);
        }
      }
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      let loadedClasses = (await classesStorage.getAll()).filter(c => c.status === 'active');
      if (isStudent && user?.studentId) {
        loadedClasses = loadedClasses.filter(c => c.enrolledStudentIds.includes(user.studentId!));
      } else if (isTeacher && user?.teacherId) {
        loadedClasses = loadedClasses.filter(c => c.teacherId === user.teacherId);
      }
      setClasses(loadedClasses);
      setStudents(await studentsStorage.getAll());
      setRecords(await attendanceStorage.getAll());
    };
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  // Auto-select first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const activeClass = classes.find(c => c.id === selectedClassId);
  const enrolledStudents = useMemo(() => {
    if (!activeClass) return [];
    let classStudents = students.filter(s => activeClass.enrolledStudentIds.includes(s.id));
    if (isStudent && user?.studentId) {
      classStudents = classStudents.filter(s => s.id === user.studentId);
    }
    return classStudents;
  }, [activeClass, students, isStudent, user]);

  // Filter records for selected class & month
  const monthRecords = useMemo(() => {
    if (!selectedClassId) return [];
    return records.filter(r => {
      if (r.classId !== selectedClassId) return false;
      const d = new Date(r.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [records, selectedClassId, selectedYear, selectedMonth]);

  // Build a lookup: { [studentId]: { [dayOfMonth]: status } }
  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<number, string>> = {};
    enrolledStudents.forEach(s => { map[s.id] = {}; });
    monthRecords.forEach(r => {
      const day = new Date(r.date).getDate();
      r.entries.forEach(e => {
        if (map[e.studentId]) {
          map[e.studentId][day] = e.status;
        }
      });
    });
    return map;
  }, [enrolledStudents, monthRecords]);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Per-student summary
  const studentSummaries = useMemo(() => {
    const summaries: Record<string, { present: number; absent: number; late: number; excused: number }> = {};
    enrolledStudents.forEach(s => {
      const dayMap = attendanceMap[s.id] || {};
      let present = 0, absent = 0, late = 0, excused = 0;
      Object.values(dayMap).forEach(status => {
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
      });
      summaries[s.id] = { present, absent, late, excused };
    });
    return summaries;
  }, [enrolledStudents, attendanceMap]);

  // Overall stats
  const totalSessions = monthRecords.length;
  const overallPresent = Object.values(studentSummaries).reduce((sum, s) => sum + s.present, 0);
  const overallAbsent = Object.values(studentSummaries).reduce((sum, s) => sum + s.absent, 0);
  const totalEntries = overallPresent + overallAbsent +
    Object.values(studentSummaries).reduce((sum, s) => sum + s.late + s.excused, 0);
  const attendanceRate = totalEntries > 0
    ? Math.round(((overallPresent + Object.values(studentSummaries).reduce((sum, s) => sum + s.late, 0)) / totalEntries) * 100)
    : 0;

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const getStatusCell = (status: string | undefined) => {
    switch (status) {
      case 'present':
        return <span className={`${styles.statusCell} ${styles.statusPresent}`} title={t('present')}>✓</span>;
      case 'absent':
        return <span className={`${styles.statusCell} ${styles.statusAbsent}`} title={t('absent')}>✗</span>;
      case 'late':
        return <span className={`${styles.statusCell} ${styles.statusLate}`} title={t('late')}>⧖</span>;
      case 'excused':
        return <span className={`${styles.statusCell} ${styles.statusExcused}`} title={t('excused')}>E</span>;
      default:
        return <span className={`${styles.statusCell} ${styles.statusNone}`}>—</span>;
    }
  };

  const getShortDayName = (day: number) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = date.getDay().toString();
    return SHORT_DAY_KEYS[dayOfWeek]?.[language] || '';
  };

  const classOptions = [
    { value: '', label: t('select_class') },
    ...classes.map(c => ({ value: c.id, label: `${c.name} (${c.subject})` })),
  ];

  const monthName = t(MONTH_KEYS[selectedMonth]);

  return (
    <div className={`page-container animate-fadeIn ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <h1>{t('absence_journal')}</h1>
        <p>{t('absence_journal_desc')}</p>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup} style={{ minWidth: '220px', flex: 1, maxWidth: '360px' }}>
          <Select
            label={t('classes')}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={classOptions}
          />
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>{t('select_month')}</span>
          <div className={styles.monthNav}>
            <button className={styles.monthNavBtn} onClick={goToPrevMonth} title={t('previous')}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className={styles.monthLabel}>
              {monthName} {selectedYear}
            </span>
            <button className={styles.monthNavBtn} onClick={goToNextMonth} title={t('next')}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {activeClass && (
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t('total_sessions')}</span>
            <span className={`${styles.summaryValue} ${styles.sessions}`}>{totalSessions}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t('total_present')}</span>
            <span className={`${styles.summaryValue} ${styles.present}`}>{overallPresent}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t('total_absent')}</span>
            <span className={`${styles.summaryValue} ${styles.absent}`}>{overallAbsent}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t('overall_attendance_rate')}</span>
            <span className={`${styles.summaryValue} ${styles.rate}`}>{attendanceRate}%</span>
          </div>
        </div>
      )}

      {/* Journal Table */}
      {!activeClass ? (
        <Card>
          <div className={styles.emptyState}>
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>{t('select_class')}</p>
          </div>
        </Card>
      ) : enrolledStudents.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p>{t('no_students')}</p>
          </div>
        </Card>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableScroll}>
            <table className={styles.journalTable}>
              <thead>
                <tr>
                  <th className={styles.stickyCol}>{t('student_name')}</th>
                  {days.map(day => (
                    <th key={day} className={styles.dayCol}>
                      <div className={styles.dayHeader}>
                        <span className={styles.dayNum}>{day}</span>
                        <span className={styles.dayName}>{getShortDayName(day)}</span>
                      </div>
                    </th>
                  ))}
                  <th className={`${styles.summaryCol} ${styles.summaryColHeader}`}>
                    {t('total_present')}
                  </th>
                  <th className={`${styles.summaryCol} ${styles.summaryColHeader}`}>
                    {t('total_absent')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map((student, idx) => {
                  const dayMap = attendanceMap[student.id] || {};
                  const summary = studentSummaries[student.id] || { present: 0, absent: 0, late: 0, excused: 0 };
                  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`;

                  return (
                    <tr key={student.id} className={`animate-fadeIn`} style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className={styles.stickyCol}>
                        <div className={styles.studentNameCell}>
                          <div className={styles.studentAvatar}>{initials}</div>
                          <div className={styles.studentDetails}>
                            <span className={styles.studentMainName}>
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        </div>
                      </td>
                      {days.map(day => (
                        <td key={day} className={styles.dayCol}>
                          {getStatusCell(dayMap[day])}
                        </td>
                      ))}
                      <td className={styles.summaryCol}>
                        <span className={styles.countPresent}>{summary.present}</span>
                      </td>
                      <td className={styles.summaryCol}>
                        <span className={styles.countAbsent}>{summary.absent}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.present}`}></span>
              <span>{t('present')}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.absent}`}></span>
              <span>{t('absent')}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.late}`}></span>
              <span>{t('late')}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.excused}`}></span>
              <span>{t('excused')}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.none}`}></span>
              <span>{t('no_records_for_month')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
