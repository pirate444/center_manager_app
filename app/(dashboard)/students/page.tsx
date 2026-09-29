'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { studentsStorage, classesStorage, paymentsStorage, attendanceStorage } from '@/lib/storage';
import { Student, ClassItem, Payment, AttendanceRecord } from '@/lib/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const emptyForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'male',
  grade: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  address: '',
  notes: '',
  medicalNotes: '',
  status: 'active',
};

export default function StudentsPage() {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const loadData = useCallback(async () => {
    setStudents(await studentsStorage.getAll());
    setClasses(await classesStorage.getAll());
    setPayments(await paymentsStorage.getAll());
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, [loadData]);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      grade: student.grade,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      notes: student.notes || '',
      medicalNotes: student.medicalNotes || '',
      status: student.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await studentsStorage.delete(id);
    setDeleteConfirm(null);
    loadData();
  };

  const columns: ColumnDef<Student>[] = [
    {
      key: 'name',
      label: t('full_name'),
      sortable: true,
      render: (item) => (
        <button
          onClick={() => setProfileStudent(item)}
          style={{ background: 'none', border: 'none', color: 'var(--text-link)', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit', padding: 0, textAlign: 'start' }}
        >
          {item.firstName} {item.lastName}
        </button>
      ),
    },
    { key: 'grade', label: t('grade'), sortable: true },
    {
      key: 'parentPhone',
      label: t('parent_phone'),
      render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.parentPhone}</span>,
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (item) => (
        <span className={`badge badge-${item.status === 'active' ? 'success' : item.status === 'inactive' ? 'warning' : 'info'}`}>
          {t(item.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
            {t('edit')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(item.id)}>
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      gender: formData.gender as 'male' | 'female',
      status: formData.status as 'active' | 'inactive' | 'graduated',
      enrolledClassIds: editingId ? ((await studentsStorage.getById(editingId))?.enrolledClassIds || []) : [],
    };

    if (editingId) {
      await studentsStorage.update(editingId, payload);
    } else {
      await studentsStorage.create(payload);
    }
    setIsModalOpen(false);
    loadData();
    setFormData({ ...emptyForm });
    setEditingId(null);
  };

  const getStudentClasses = (student: Student) => {
    return classes.filter(c => student.enrolledClassIds.includes(c.id));
  };

  const getStudentPayments = (studentId: string) => {
    return payments.filter(p => p.studentId === studentId);
  };

  return (
    <div className="page-container animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{t('students')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {students.length} {t('student_count')}
          </p>
        </div>
        <Button onClick={openAdd}>{t('add_student')}</Button>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <DataTable
          data={students}
          columns={columns}
          searchable
          searchPlaceholder={t('search_students')}
          pagination
          itemsPerPage={10}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('edit_student') : t('add_student')}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('first_name')} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label={t('last_name')} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input type="date" label={t('date_of_birth')} value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} required />
            <Select label={t('gender')} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} options={[{ value: 'male', label: t('male') }, { value: 'female', label: t('female') }]} required />
          </div>
          <Input label={t('grade')} value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('parent_name')} value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} required />
            <Input label={t('parent_phone')} value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} required />
          </div>
          <Input label={t('parent_email')} type="email" value={formData.parentEmail} onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })} />
          <Input label={t('address')} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <Select label={t('status')} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={[{ value: 'active', label: t('active') }, { value: 'inactive', label: t('inactive') }, { value: 'graduated', label: t('graduated') }]} required />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={t('confirm')}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{t('confirm_delete_student')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{t('delete')}</Button>
        </div>
      </Modal>

      {/* Student Profile Modal */}
      <Modal isOpen={!!profileStudent} onClose={() => setProfileStudent(null)} title={t('student_profile')}>
        {profileStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Personal Info */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('personal_info')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('full_name')}</span><div style={{ fontWeight: 600 }}>{profileStudent.firstName} {profileStudent.lastName}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('gender')}</span><div>{t(profileStudent.gender)}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('date_of_birth')}</span><div>{profileStudent.dateOfBirth}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('grade')}</span><div>{profileStudent.grade}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('status')}</span><div><span className={`badge badge-${profileStudent.status === 'active' ? 'success' : 'warning'}`}>{t(profileStudent.status)}</span></div></div>
              </div>
            </div>

            {/* Guardian Info */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('guardian_info')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('parent_name')}</span><div style={{ fontWeight: 600 }}>{profileStudent.parentName}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('parent_phone')}</span><div>{profileStudent.parentPhone}</div></div>
                {profileStudent.parentEmail && <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('parent_email')}</span><div>{profileStudent.parentEmail}</div></div>}
              </div>
            </div>

            {/* Enrolled Classes */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('enrolled_classes')}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {getStudentClasses(profileStudent).length === 0 ? (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('no_classes')}</span>
                ) : (
                  getStudentClasses(profileStudent).map(c => (
                    <span key={c.id} className="badge badge-info" style={{ borderColor: c.color, color: c.color }}>{c.name}</span>
                  ))
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('payment_history')}</h4>
              {(() => {
                const payments = getStudentPayments(profileStudent.id);
                if (payments.length === 0) return <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('no_payments')}</span>;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {payments.slice(0, 5).map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.875rem' }}>{p.description}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 600 }}>{p.amount} {t('dinar')}</span>
                          <span className={`badge badge-${p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'error' : 'warning'}`}>{t(p.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
