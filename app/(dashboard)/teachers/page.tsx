'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { teachersStorage, classesStorage } from '@/lib/storage';
import { Teacher, ClassItem } from '@/lib/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialization: '',
  status: 'active',
  hireDate: new Date().toISOString().split('T')[0],
};

export default function TeachersPage() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileTeacher, setProfileTeacher] = useState<Teacher | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const loadData = useCallback(async () => {
    setTeachers(await teachersStorage.getAll());
    setClasses(await classesStorage.getAll());
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

  const openEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      specialization: teacher.specialization,
      status: teacher.status,
      hireDate: teacher.hireDate ? teacher.hireDate.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await teachersStorage.delete(id);
    setDeleteConfirm(null);
    loadData();
  };

  const columns: ColumnDef<Teacher>[] = [
    {
      key: 'name',
      label: t('full_name'),
      sortable: true,
      render: (item) => (
        <button
          onClick={() => setProfileTeacher(item)}
          style={{ background: 'none', border: 'none', color: 'var(--text-link)', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit', padding: 0, textAlign: 'start' }}
        >
          {item.firstName} {item.lastName}
        </button>
      ),
    },
    { key: 'specialization', label: t('specialization'), sortable: true },
    {
      key: 'email',
      label: t('email'),
      render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.email}</span>,
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (item) => (
        <span className={`badge badge-${item.status === 'active' ? 'success' : 'warning'}`}>
          {t(item.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>{t('edit')}</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(item.id)}>{t('delete')}</Button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      status: formData.status as 'active' | 'inactive',
      assignedClassIds: editingId ? ((await teachersStorage.getById(editingId))?.assignedClassIds || []) : [],
    };
    if (editingId) {
      await teachersStorage.update(editingId, payload);
    } else {
      await teachersStorage.create(payload);
    }
    setIsModalOpen(false);
    loadData();
    setFormData({ ...emptyForm });
    setEditingId(null);
  };

  const getTeacherClasses = (teacher: Teacher) => {
    return classes.filter(c => teacher.assignedClassIds.includes(c.id));
  };

  return (
    <div className="page-container animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{t('teachers')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {teachers.length} {t('teacher_count')}
          </p>
        </div>
        <Button onClick={openAdd}>{t('add_teacher')}</Button>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <DataTable data={teachers} columns={columns} searchable searchPlaceholder={t('search')} pagination itemsPerPage={10} />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('edit_teacher') : t('add_teacher')}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('first_name')} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label={t('last_name')} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input type="email" label={t('email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <Input type="tel" label={t('phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          </div>
          <Input label={t('specialization')} value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input type="date" label={t('hire_date')} value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} required />
            <Select label={t('status')} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={[{ value: 'active', label: t('active') }, { value: 'inactive', label: t('inactive') }]} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={t('confirm')}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{t('confirm_delete_teacher')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{t('delete')}</Button>
        </div>
      </Modal>

      {/* Teacher Profile Modal */}
      <Modal isOpen={!!profileTeacher} onClose={() => setProfileTeacher(null)} title={t('teacher_profile')}>
        {profileTeacher && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('personal_info')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('full_name')}</span><div style={{ fontWeight: 600 }}>{profileTeacher.firstName} {profileTeacher.lastName}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('email')}</span><div>{profileTeacher.email}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('phone')}</span><div>{profileTeacher.phone}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('specialization')}</span><div>{profileTeacher.specialization}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('hire_date')}</span><div>{profileTeacher.hireDate?.split('T')[0]}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{t('status')}</span><div><span className={`badge badge-${profileTeacher.status === 'active' ? 'success' : 'warning'}`}>{t(profileTeacher.status)}</span></div></div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('assigned_classes')}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {getTeacherClasses(profileTeacher).length === 0 ? (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('no_classes')}</span>
                ) : (
                  getTeacherClasses(profileTeacher).map(c => (
                    <span key={c.id} className="badge badge-info" style={{ borderColor: c.color, color: c.color }}>{c.name} — {c.room}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
