'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { paymentsStorage, studentsStorage, classesStorage } from '@/lib/storage';
import { Payment, Student, ClassItem } from '@/lib/types';
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'paid',
    method: 'cash',
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
      months: []
    });
  };

  // Calculate totals
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

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
  
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const formatMonth = (monthValue?: string) => {
    if (!monthValue) return '';
    const [y, m] = monthValue.split('-');
    const mIdx = parseInt(m) - 1;
    return `${t(MONTH_KEYS[mIdx])} ${y}`;
  };

  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{t('billing_overview')}</h1>
        </div>
        {isManagerOrAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>{t('record_payment')}</Button>
        )}
      </div>

      {!isStudent && (
      <div className={styles.overviewGrid}>
        <div className={`${styles.overviewCard} ${styles.cardCollected}`}>
          <div className={styles.cardLabel}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('total_collected')}
          </div>
          <div className={`${styles.cardValue} ${styles.success}`}>
            {totalCollected.toLocaleString()} <span className={styles.cardCurrency}>{t('dinar')}</span>
          </div>
        </div>

        <div className={`${styles.overviewCard} ${styles.cardPending}`}>
          <div className={styles.cardLabel}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('total_pending')}
          </div>
          <div className={`${styles.cardValue} ${styles.warning}`}>
            {totalPending.toLocaleString()} <span className={styles.cardCurrency}>{t('dinar')}</span>
          </div>
        </div>

        <div className={`${styles.overviewCard} ${styles.cardOverdue}`}>
          <div className={styles.cardLabel}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('total_overdue')}
          </div>
          <div className={`${styles.cardValue} ${styles.error}`}>
            {totalOverdue.toLocaleString()} <span className={styles.cardCurrency}>{t('dinar')}</span>
          </div>
        </div>
      </div>
      )}

      <div className={styles.studentsList}>
        {students.filter(s => s.status === 'active' && s.enrolledClassIds.length > 0).map(student => {
          const isExpanded = isStudent || expandedStudents.includes(student.id);
          return (
          <div key={student.id} className={styles.studentGroup}>
            <div 
              className={styles.studentHeader}
              onClick={() => !isStudent && setExpandedStudents(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
              style={{ cursor: isStudent ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className={styles.studentAvatar}>
                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                </div>
                <div className={styles.studentName}>
                  {student.firstName} {student.lastName}
                </div>
              </div>
              {!isStudent && (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--text-secondary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            
            {isExpanded && (
            <div className={styles.classList}>
              {student.enrolledClassIds.map(classId => {
                const cls = classes.find(c => c.id === classId);
                if (!cls) return null;
                const classPayments = payments.filter(p => p.studentId === student.id && p.classId === classId).sort((a,b) => (b.month || '').localeCompare(a.month || ''));

                return (
                  <div key={classId} className={styles.classItem}>
                    <div className={styles.classHeader}>
                      <div className={styles.className}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cls.color || '#3b82f6' }}></div>
                        {cls.name} <span className={styles.classSubject}>({cls.subject})</span>
                      </div>
                      <Link href={`/absence-journal?classId=${cls.id}&month=${currentMonthValue}`} className={styles.journalLink}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        Absence Journal
                      </Link>
                    </div>

                    {classPayments.length > 0 ? (
                      <div className={styles.paymentGrid}>
                        {classPayments.map(p => (
                          <div key={p.id} className={styles.paymentMonthCard}>
                            <div className={styles.paymentMonthName}>{formatMonth(p.month) || 'Unknown Month'}</div>
                            <div className={styles.paymentAmount}>{p.amount} {t('dinar')}</div>
                            <span className={`${styles.paymentStatus} badge-${p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'error' : 'warning'}`} style={{ color: '#fff', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>
                              {t(p.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                        No payments recorded for this class.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )})}
      </div>

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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={formData.months.length === 0 || !formData.classId}>{t('save')}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
