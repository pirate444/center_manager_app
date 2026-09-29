'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { classesStorage, studentsStorage, attendanceStorage } from '@/lib/storage';
import { ClassItem, Student, AttendanceRecord, AttendanceStatus, AttendanceEntry } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { DataTable } from '@/components/ui/DataTable';
import styles from './Attendance.module.css';

export default function AttendancePage() {
  const { t } = useTranslation();
  const { user, isTeacher, isStudent, isManagerOrAdmin } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [attendanceEntries, setAttendanceEntries] = useState<Record<string, AttendanceStatus>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    async function loadData() {
      let loadedClasses = (await classesStorage.getAll()).filter(c => c.status === 'active');
      
      if (isTeacher && user?.teacherId) {
        loadedClasses = loadedClasses.filter(c => c.teacherId === user.teacherId);
      }
      
      setClasses(loadedClasses);
      setStudents(await studentsStorage.getAll());
      
      let allRecords = await attendanceStorage.getAll();
      if (isTeacher && user?.teacherId) {
        const teacherClassIds = loadedClasses.map(c => c.id);
        allRecords = allRecords.filter(r => teacherClassIds.includes(r.classId));
      }
      setRecords(allRecords);
    }
    loadData();
  }, [isTeacher, user?.teacherId]);

  if (isStudent) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Update entries when class or date changes
  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceEntries({});
      return;
    }

    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;

    // Check if record exists for this date
    const existingRecord = records.find(r => r.classId === selectedClassId && r.date === selectedDate);
    
    if (existingRecord) {
      const entryMap: Record<string, AttendanceStatus> = {};
      existingRecord.entries.forEach(e => {
        entryMap[e.studentId] = e.status;
      });
      // Fill missing enrolled students with default (present)
      cls.enrolledStudentIds.forEach(id => {
        if (!entryMap[id]) entryMap[id] = 'present';
      });
      setAttendanceEntries(entryMap);
    } else {
      // Default all enrolled to present
      const entryMap: Record<string, AttendanceStatus> = {};
      cls.enrolledStudentIds.forEach(id => {
        entryMap[id] = 'present';
      });
      setAttendanceEntries(entryMap);
    }
  }, [selectedClassId, selectedDate, classes, records]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const newToast = { id: Date.now().toString(), message, type };
    setToasts(prev => [...prev, newToast]);
  };

  const handleSave = async () => {
    if (!selectedClassId || !user) return;

    const entriesToSave: AttendanceEntry[] = Object.entries(attendanceEntries).map(([studentId, status]) => ({
      studentId,
      status
    }));

    const existingRecordIndex = records.findIndex(r => r.classId === selectedClassId && r.date === selectedDate);
    
    let updatedRecords = [...records];
    if (existingRecordIndex >= 0) {
      const record = records[existingRecordIndex];
      const updated = await attendanceStorage.update(record.id, { entries: entriesToSave, markedBy: user.id });
      updatedRecords[existingRecordIndex] = updated;
    } else {
      const created = await attendanceStorage.create({
        classId: selectedClassId,
        date: selectedDate,
        entries: entriesToSave,
        markedBy: user.id
      });
      updatedRecords.push(created);
    }
    
    setRecords(updatedRecords);
    showToast(t('attendance_saved') || 'Attendance saved successfully', 'success');
  };

  const bulkMark = (status: AttendanceStatus) => {
    const updated = { ...attendanceEntries };
    Object.keys(updated).forEach(id => {
      updated[id] = status;
    });
    setAttendanceEntries(updated);
  };

  const activeClass = classes.find(c => c.id === selectedClassId);
  const enrolledStudents = activeClass 
    ? students.filter(s => activeClass.enrolledStudentIds.includes(s.id))
    : [];

  const classOptions = [
    { value: '', label: t('select_class') || 'Select Class' },
    ...classes.map(c => ({ value: c.id, label: `${c.name} (${c.subject})` }))
  ];

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
      case 'absent': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
      case 'late': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'excused': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  // History Tab Data
  const historyColumns = [
    { 
      key: 'date', 
      label: t('date'), 
      sortable: true,
      render: (item: any) => new Date(item.date).toLocaleDateString()
    },
    { 
      key: 'class', 
      label: t('classes'),
      sortable: true, 
      render: (item: any) => classes.find(c => c.id === item.classId)?.name || '-'
    },
    { 
      key: 'present', 
      label: t('present'), 
      render: (item: any) => item.entries.filter((e: any) => e.status === 'present').length
    },
    { 
      key: 'absent', 
      label: t('absent'), 
      render: (item: any) => item.entries.filter((e: any) => e.status === 'absent').length
    }
  ];

  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">{t('attendance')}</h1>
      </div>

      <Tabs>
        <Tab id="mark" label={t('mark_attendance')}>
          <div className={styles.attendanceGrid}>
            <div className={styles.sidebar}>
              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Select
                    label={t('classes')}
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    options={classOptions}
                  />
                  <Input
                    type="date"
                    label={t('date')}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </Card>

              {activeClass && (
                <Card>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                    {t('attendance_summary')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--color-success-bg)', borderRadius: '8px', border: '1px solid var(--color-success-border)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                        {Object.values(attendanceEntries).filter(v => v === 'present').length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>{t('present')}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--color-error-bg)', borderRadius: '8px', border: '1px solid var(--color-error-border)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>
                        {Object.values(attendanceEntries).filter(v => v === 'absent').length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{t('absent')}</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="main-content">
              {!selectedClassId ? (
                <Card style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-tertiary)' }}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{t('select_class')} {t('date')} {t('mark_attendance')}</p>
                </Card>
              ) : (
                <Card>
                  <div className={styles.bulkActions}>
                    <Button variant="secondary" size="sm" onClick={() => bulkMark('present')}>{t('mark_all_present')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => bulkMark('absent')}>{t('mark_all_absent')}</Button>
                  </div>
                  
                  {enrolledStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      {t('no_students')}
                    </div>
                  ) : (
                    <div className={styles.studentList}>
                      {enrolledStudents.map(student => (
                        <div key={student.id} className={styles.studentRow}>
                          <div className={styles.studentInfo}>
                            <span className={styles.studentName}>{student.firstName} {student.lastName}</span>
                            <span className={styles.studentId}>{student.grade}</span>
                          </div>
                          <div className={styles.statusGroup}>
                            {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                              <button
                                key={status}
                                className={`${styles.statusBtn} ${styles[status]} ${attendanceEntries[student.id] === status ? styles.active : ''}`}
                                onClick={() => setAttendanceEntries(prev => ({ ...prev, [student.id]: status }))}
                                title={t(status)}
                              >
                                {getStatusIcon(status)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.saveBar}>
                    <Button variant="primary" onClick={handleSave} disabled={enrolledStudents.length === 0}>
                      {t('save_attendance')}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </Tab>
        <Tab id="history" label={t('attendance_history')}>
          <Card>
            <DataTable 
              data={records} 
              columns={historyColumns} 
              pagination 
              itemsPerPage={10} 
            />
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}
