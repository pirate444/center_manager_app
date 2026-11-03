'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { paymentsStorage, studentsStorage, classesStorage, attendanceStorage } from '@/lib/storage';
import { Payment, Student, ClassItem, AttendanceRecord } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import Link from 'next/link';
import styles from './Billing.module.css';

const MONTH_KEYS = [
  'month_january', 'month_february', 'month_march', 'month_april',
  'month_may', 'month_june', 'month_july', 'month_august',
  'month_september', 'month_october', 'month_november', 'month_december',
];



export default function BillingPage() {
  const { t } = useTranslation();
  const { user, isStudent, isManagerOrAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- Edit Modal state ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    description: '',
    dueDate: '',
    status: 'paid',
    method: 'cash',
    collectedByTeacher: false,
  });

  // --- Accordion state ---
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  // --- Month navigation (like absence journal) ---
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'paid',
    method: 'cash',
    collectedByTeacher: false,
    months: [] as string[]
  });

  const loadData = async () => {
    let allPayments = await paymentsStorage.getAll();
    let allStudents = await studentsStorage.getAll();
    
    if (isStudent && user?.studentId) {
      allPayments = allPayments.filter(p => p.studentId === user.studentId);
      allStudents = allStudents.filter(s => s.id === user.studentId);
    }
    
    setPayments(allPayments);
    setStudents(allStudents);
    setClasses(await classesStorage.getAll());
    setAttendanceRecords(await attendanceStorage.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
  };

  const handleMonthToggle = (monthValue: string) => {
    setFormData(prev => {
      if (prev.months.includes(monthValue)) {
        return { ...prev, months: prev.months.filter(m => m !== monthValue) };
      }
      return { ...prev, months: [...prev.months, monthValue] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.classId || formData.months.length === 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const createPromises = formData.months.map(month => {
      return paymentsStorage.create({
        studentId: formData.studentId,
        classId: formData.classId,
        month: month,
        amount: Number(formData.amount),
        currency: 'TND',
        dueDate: formData.dueDate,
        paidDate: formData.status === 'paid' ? new Date().toISOString() : undefined,
        status: formData.status as any,
        method: formData.status === 'paid' ? formData.method as any : undefined,
        description: formData.description || `${month} Payment`,
        collectedByTeacher: formData.collectedByTeacher,
      } as any);
    });

    await Promise.all(createPromises);

    showToast(t('payment_recorded') || 'Payment recorded successfully', 'success');
    setIsModalOpen(false);
    loadData();
    setFormData({
      studentId: '',
      classId: '',
      amount: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'paid',
      method: 'cash',
      collectedByTeacher: false,
      months: []
    });
  };

  // --- Edit Payment ---
  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setEditFormData({
      amount: String(payment.amount),
      description: payment.description || '',
      dueDate: payment.dueDate || '',
      status: payment.status,
      method: payment.method || 'cash',
      collectedByTeacher: payment.collectedByTeacher || false,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    await paymentsStorage.update(editingPayment.id, {
      amount: Number(editFormData.amount),
      description: editFormData.description,
      dueDate: editFormData.dueDate,
      status: editFormData.status as any,
      method: editFormData.status === 'paid' ? editFormData.method as any : undefined,
      paidDate: editFormData.status === 'paid' ? (editingPayment.paidDate || new Date().toISOString()) : undefined,
      collectedByTeacher: editFormData.collectedByTeacher,
    });

    showToast(t('payment_updated') || 'Payment updated successfully', 'success');
    setIsEditModalOpen(false);
    setEditingPayment(null);
    loadData();
  };

  // --- Toggle collected status inline ---
  const toggleCollected = useCallback(async (payment: Payment) => {
    await paymentsStorage.update(payment.id, {
      collectedByTeacher: !payment.collectedByTeacher,
    });
    loadData();
    showToast(
      !payment.collectedByTeacher
        ? (t('marked_collected') || 'Marked as collected')
        : (t('marked_not_collected') || 'Marked as not collected'),
      'info'
    );
  }, []);

  // Selected month value in YYYY-MM format
  const selectedMonthValue = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Calculate totals for the selected month
  const monthPayments = payments.filter(p => p.month === selectedMonthValue);
  const totalCollected = monthPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = monthPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = monthPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  const studentOptions = [
    { value: '', label: t('select_student') || 'Select Student' },
    ...students.filter(s => s.status === 'active').map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))
  ];

  const selectedStudent = students.find(s => s.id === formData.studentId);
  const classOptions = [
    { value: '', label: t('select_class') || 'Select Class' },
    ...(selectedStudent 
      ? classes.filter(c => selectedStudent.enrolledClassIds.includes(c.id)).map(c => ({ value: c.id, label: c.name }))
      : [])
  ];

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -1; i < 11; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value, labelKey: MONTH_KEYS[d.getMonth()], year: d.getFullYear() });
    }
    return options;
  };
  const monthOptions = getMonthOptions();
  
  const formatMonth = (monthValue?: string) => {
    if (!monthValue) return '';
    const [y, m] = monthValue.split('-');
    const mIdx = parseInt(m) - 1;
    return `${t(MONTH_KEYS[mIdx])} ${y}`;
  };

  // Month navigation
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

  const monthName = t(MONTH_KEYS[selectedMonth]);

  // Compute total sessions per class per month and attended sessions per student from attendance records
  const { totalSessionsMap, attendedSessionsMap } = useMemo(() => {
    const totalMap: Record<string, number> = {}; // key: `${classId}-${YYYY-MM}` → count of attendance records
    const attendedMap: Record<string, number> = {}; // key: `${studentId}-${classId}-${YYYY-MM}` → present/late count
    attendanceRecords.forEach(record => {
      if (!record.date || !record.classId) return;
      const month = record.date.substring(0, 7); // YYYY-MM
      const classMonthKey = `${record.classId}-${month}`;
      totalMap[classMonthKey] = (totalMap[classMonthKey] || 0) + 1;
      record.entries.forEach(entry => {
        if (entry.status === 'present' || entry.status === 'late') {
          const key = `${entry.studentId}-${record.classId}-${month}`;
          attendedMap[key] = (attendedMap[key] || 0) + 1;
        }
      });
    });
    return { totalSessionsMap: totalMap, attendedSessionsMap: attendedMap };
  }, [attendanceRecords]);

  // Build the class → students → billing data for the SELECTED month
  // Students without a payment record for the selected month are shown as "pending" automatically
  const groupedData = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active' && s.enrolledClassIds.length > 0);
    const activeClasses = classes.filter(c => c.status === 'active');

    return activeClasses.map(cls => {
      const classStudents = activeStudents.filter(s => s.enrolledClassIds.includes(cls.id));
      
      const studentsWithBilling = classStudents.map(student => {
        // Find the payment for THIS student in THIS class for the SELECTED month
        const monthPayment = payments.find(
          p => p.studentId === student.id && p.classId === cls.id && p.month === selectedMonthValue
        );

        // Determine billing status for this month:
        // If a payment record exists → use its status
        // If no payment record exists → treat as "pending"
        const billingStatus: string = monthPayment ? monthPayment.status : 'pending';
        const billingAmount: number = monthPayment ? monthPayment.amount : 0;

        return { student, payment: monthPayment || null, billingStatus, billingAmount };
      });

      // Apply search filter
      const filteredStudents = studentsWithBilling.filter(({ student }) => {
        if (!searchQuery) return true;
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      });

      // Apply status filter
      const visibleStudents = filterStatus !== 'all'
        ? filteredStudents.filter(s => s.billingStatus === filterStatus)
        : filteredStudents;

      return { cls, students: visibleStudents };
    }).filter(group => group.students.length > 0);
  }, [students, classes, payments, searchQuery, filterStatus, selectedMonthValue]);

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  // Render for student self-view (keep existing compact style)
  if (isStudent) {
    return (
      <div className="page-container animate-fadeIn">
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h1 className="page-title">{t('billing_overview')}</h1>
        </div>
        <div className={styles.studentsList}>
          {students.filter(s => s.status === 'active' && s.enrolledClassIds.length > 0).map(student => (
            <div key={student.id} className={styles.studentGroup}>
              <div className={styles.studentHeader} style={{ cursor: 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.studentAvatar}>
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                  <div className={styles.studentName}>
                    {student.firstName} {student.lastName}
                  </div>
                </div>
              </div>
              <div className={styles.classList}>
                {student.enrolledClassIds.map(classId => {
                  const cls = classes.find(c => c.id === classId);
                  if (!cls) return null;
                  const classPayments = payments.filter(p => p.studentId === student.id && p.classId === classId).sort((a,b) => (b.month || '').localeCompare(a.month || ''));

                  return (
                    <div key={classId} className={styles.classItem}>
                      <div className={styles.classHeader}>
                        <div className={styles.className}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cls.color || '#3b82f6' }}></div>
                          {cls.name} <span className={styles.classSubject}>({cls.subject})</span>
                        </div>
                        <Link href={`/absence-journal?classId=${cls.id}&month=${currentMonthValue}`} className={styles.journalLink}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                          Absence Journal
                        </Link>
                      </div>

                      {classPayments.length > 0 ? (
                        <div className={styles.paymentGrid}>
                          {classPayments.map(p => (
                            <div key={p.id} className={styles.paymentMonthCard}>
                              <div className={styles.paymentMonthName}>{formatMonth(p.month) || 'Unknown Month'}</div>
                              <div className={styles.paymentAmount}>{p.amount} {t('dinar')}</div>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                <span className={`${styles.paymentStatusBadge} ${p.status === 'paid' ? styles.badgePaid : p.status === 'overdue' ? styles.badgeOverdue : styles.badgePending}`}>
                                  {t(p.status)}
                                </span>
                              </div>
                              {p.description && (
                                <div className={styles.paymentDescription}>
                                  {p.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.noPayments}>
                          No payments recorded for this class.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main admin/manager view — class → students accordion
  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 className="page-title">{t('billing_overview')}</h1>
        {isManagerOrAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>{t('record_payment')}</Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className={styles.overviewGrid}>
        <div className={`${styles.overviewCard} ${styles.cardCollected}`}>
          <div className={styles.cardLabel}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('total_collected')}
          </div>
          <div className={`${styles.cardValue} ${styles.success}`}>
            {totalCollected.toLocaleString()} <span className={styles.cardCurrency}>{t('dinar')}</span>
          </div>
        </div>

        <div className={`${styles.overviewCard} ${styles.cardPending}`}>
          <div className={styles.cardLabel}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('total_pending')}
          </div>
          <div className={`${styles.cardValue} ${styles.warning}`}>
            {totalPending.toLocaleString()} <span className={styles.cardCurrency}>{t('dinar')}</span>
          </div>
        </div>

        <div className={`${styles.overviewCard} ${styles.cardOverdue}`}>
          <div className={styles.cardLabel}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('total_overdue')}
          </div>
          <div className={`${styles.cardValue} ${styles.error}`}>
            {totalOverdue.toLocaleString()} <span className={styles.cardCurrency}>{t('dinar')}</span>
          </div>
        </div>
      </div>

      {/* Month Navigation & Filters Toolbar */}
      <div className={styles.filtersToolbar}>
        <div className={styles.searchInputWrapper}>
          <div className={styles.searchIcon}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('search_students') || 'Search students...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.monthNavGroup}>
          <span className={styles.monthNavLabel}>{t('select_month') || 'SELECT MONTH'}</span>
          <div className={styles.monthNav}>
            <button className={styles.monthNavBtn} onClick={goToPrevMonth} title={t('previous') || 'Previous'}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className={styles.monthLabel}>
              {monthName} {selectedYear}
            </span>
            <button className={styles.monthNavBtn} onClick={goToNextMonth} title={t('next') || 'Next'}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">{t('all_statuses') || 'All statuses'}</option>
          <option value="paid">{t('paid') || 'Paid'}</option>
          <option value="pending">{t('pending') || 'Pending'}</option>
          <option value="overdue">{t('overdue') || 'Overdue'}</option>
        </select>
      </div>

      {/* Class → Students Accordion */}
      {groupedData.length > 0 ? (
        groupedData.map(({ cls, students: classStudents }) => {
          const isClassOpen = expandedClasses.includes(cls.id);
          return (
            <div key={cls.id} className={styles.classAccordion}>
              <div className={styles.classAccordionHeader} onClick={() => toggleClass(cls.id)}>
                <div className={styles.classAccordionLeft}>
                  <div className={styles.classColorDot} style={{ backgroundColor: cls.color || '#3b82f6' }} />
                  <span className={styles.classAccordionName}>
                    {cls.name}
                    <span className={styles.classAccordionSubject}> ({cls.subject})</span>
                  </span>
                </div>
                <div className={styles.classAccordionRight}>
                  <span className={styles.classStudentCount}>
                    {classStudents.length} {classStudents.length === 1 ? (t('student') || 'student') : (t('students') || 'students')}
                  </span>
                  <Link
                    href={`/absence-journal?classId=${cls.id}&month=${selectedMonthValue}`}
                    className={styles.journalLink}
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Absence Journal
                  </Link>
                  <div className={`${styles.classChevron} ${isClassOpen ? styles.classChevronOpen : ''}`}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {isClassOpen && (
                <div className={styles.classAccordionBody}>
                  {classStudents.map(({ student, payment, billingStatus, billingAmount }) => {
                    const sessionsThisMonth = totalSessionsMap[`${cls.id}-${selectedMonthValue}`] || 0;
                    const attendedKey = `${student.id}-${cls.id}-${selectedMonthValue}`;
                    const attendedSessions = attendedSessionsMap[attendedKey] || 0;

                    return (
                      <div key={student.id} className={styles.studentRow}>
                        <div className={styles.studentRowHeader}>
                          <div className={styles.studentRowLeft}>
                            <div className={styles.studentAvatar}>
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </div>
                            <span className={styles.studentName}>
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                          <div className={styles.studentRowRight}>
                            {/* Billing status dot for this month */}
                            <div className={styles.studentStatusSummary}>
                              <div
                                className={`${styles.statusDot} ${
                                  billingStatus === 'paid' ? styles.statusDotPaid
                                    : billingStatus === 'overdue' ? styles.statusDotOverdue
                                    : styles.statusDotPending
                                }`}
                                title={`${t(billingStatus)} (${formatMonth(selectedMonthValue)})`}
                              />
                            </div>
                            {/* Status badge */}
                            <span className={`${styles.paymentStatusBadge} ${
                              billingStatus === 'paid' ? styles.badgePaid
                                : billingStatus === 'overdue' ? styles.badgeOverdue
                                : styles.badgePending
                            }`}>
                              {t(billingStatus)}
                            </span>
                            {/* Amount info */}
                            {billingStatus === 'paid' && billingAmount > 0 && (
                              <span className={styles.paidAmount}>
                                {billingAmount} {t('dinar')}
                              </span>
                            )}
                            {/* Sessions info */}
                            <span className={styles.sessionsInfo} title={`${attendedSessions} attended / ${sessionsThisMonth} total sessions`}>
                              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {attendedSessions}/{sessionsThisMonth}
                            </span>
                            {/* Collected badge (only if payment exists and is paid) */}
                            {payment && payment.status === 'paid' && (
                              <span
                                className={`${styles.collectedBadge} ${payment.collectedByTeacher ? styles.collectedYes : styles.collectedNo}`}
                                onClick={(e) => { e.stopPropagation(); toggleCollected(payment); }}
                                title={payment.collectedByTeacher ? (t('collected') || 'Collected') : (t('not_collected') || 'Not collected — click to toggle')}
                              >
                                {payment.collectedByTeacher ? (
                                  <>
                                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    {t('collected') || 'Collected'}
                                  </>
                                ) : (
                                  <>
                                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" /></svg>
                                    {t('not_collected') || 'Not Collected'}
                                  </>
                                )}
                              </span>
                            )}
                            {/* Edit button (if payment exists) or Record button (if no payment) */}
                            {isManagerOrAdmin && (
                              payment ? (
                                <button
                                  className={styles.editBtn}
                                  onClick={(e) => { e.stopPropagation(); openEditModal(payment); }}
                                  title={t('edit_payment') || 'Edit payment'}
                                >
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  className={styles.recordBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData({
                                      ...formData,
                                      studentId: student.id,
                                      classId: cls.id,
                                      months: [selectedMonthValue],
                                    });
                                    setIsModalOpen(true);
                                  }}
                                  title={t('record_payment') || 'Record payment'}
                                >
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className={styles.noResults}>
          {searchQuery || filterStatus !== 'all'
            ? (t('no_results_found') || 'No results found for your filters.')
            : (t('no_billing_data') || 'No billing data available.')}
        </div>
      )}

      {/* Record Payment Modal */}
      {isManagerOrAdmin && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('record_payment')}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                label={t('students')}
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value, classId: '', months: [] })}
                options={studentOptions}
                required
              />
              <Select
                label={t('classes') || 'Class'}
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                options={classOptions}
                required
                disabled={!formData.studentId}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('select_month') || 'Select Months'}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                {monthOptions.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.months.includes(opt.value)}
                      onChange={() => handleMonthToggle(opt.value)}
                    />
                    {t(opt.labelKey)} {opt.year}
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                type="number"
                label={`${t('amount')} (${t('dinar')}) / Month`}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                min={0}
                required
              />
              <Input
                type="date"
                label={t('due_date')}
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <Input
              label={t('description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Monthly fee"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                label={t('status')}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'paid', label: t('paid') },
                  { value: 'pending', label: t('pending') },
                  { value: 'overdue', label: t('overdue') }
                ]}
                required
              />
              {formData.status === 'paid' && (
                <Select
                  label={t('payment_method')}
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  options={[
                    { value: 'cash', label: t('cash') },
                    { value: 'bank_transfer', label: t('bank_transfer') },
                    { value: 'check', label: t('check_payment') },
                    { value: 'online', label: t('online_payment') }
                  ]}
                  required
                />
              )}
            </div>

            {/* Collected by teacher toggle */}
            {formData.status === 'paid' && (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={formData.collectedByTeacher}
                  onChange={(e) => setFormData({ ...formData, collectedByTeacher: e.target.checked })}
                />
                <span>{t('collected_by_teacher') || 'I have collected my payment share'}</span>
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={formData.months.length === 0 || !formData.classId}>{t('save')}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Payment Modal */}
      {isManagerOrAdmin && editingPayment && (
        <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingPayment(null); }} title={t('edit_payment') || 'Edit Payment'}>
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Show student & month as read-only context */}
            <div className={styles.editContext}>
              <div className={styles.editContextItem}>
                <span className={styles.editContextLabel}>{t('student') || 'Student'}</span>
                <span className={styles.editContextValue}>
                  {(() => { const s = students.find(s => s.id === editingPayment.studentId); return s ? `${s.firstName} ${s.lastName}` : editingPayment.studentId; })()}
                </span>
              </div>
              <div className={styles.editContextItem}>
                <span className={styles.editContextLabel}>{t('month') || 'Month'}</span>
                <span className={styles.editContextValue}>{formatMonth(editingPayment.month)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                type="number"
                label={`${t('amount')} (${t('dinar')})`}
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                min={0}
                required
              />
              <Input
                type="date"
                label={t('due_date')}
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                required
              />
            </div>

            <Input
              label={t('description')}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              placeholder="Payment description"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                label={t('status')}
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                options={[
                  { value: 'paid', label: t('paid') },
                  { value: 'pending', label: t('pending') },
                  { value: 'overdue', label: t('overdue') }
                ]}
                required
              />
              {editFormData.status === 'paid' && (
                <Select
                  label={t('payment_method')}
                  value={editFormData.method}
                  onChange={(e) => setEditFormData({ ...editFormData, method: e.target.value })}
                  options={[
                    { value: 'cash', label: t('cash') },
                    { value: 'bank_transfer', label: t('bank_transfer') },
                    { value: 'check', label: t('check_payment') },
                    { value: 'online', label: t('online_payment') }
                  ]}
                  required
                />
              )}
            </div>

            {/* Collected by teacher toggle */}
            {editFormData.status === 'paid' && (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={editFormData.collectedByTeacher}
                  onChange={(e) => setEditFormData({ ...editFormData, collectedByTeacher: e.target.checked })}
                />
                <span>{t('collected_by_teacher') || 'I have collected my payment share'}</span>
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="ghost" type="button" onClick={() => { setIsEditModalOpen(false); setEditingPayment(null); }}>{t('cancel')}</Button>
              <Button type="submit">{t('save_changes') || 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
