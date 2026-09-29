'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { classesStorage, teachersStorage, studentsStorage } from '@/lib/storage';
import { ClassItem, Teacher, Student } from '@/lib/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const emptyForm = {
  name: '',
  subject: '',
  teacherId: '',
  room: '',
  maxCapacity: 30,
  status: 'active',
  color: '#06b6d4',
};

export default function ClassesPage() {
  const { t } = useTranslation();
  const { isManagerOrAdmin, isTeacher, user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enrollmentClass, setEnrollmentClass] = useState<ClassItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  
  // Enrollment state
  const [enrollSearch, setEnrollSearch] = useState('');

  const loadData = useCallback(async () => {
    const allClasses = await classesStorage.getAll();
    if (isTeacher && user?.teacherId) {
      setClasses(allClasses.filter(c => c.teacherId === user.teacherId));
    } else if (isTeacher) {
      setClasses([]); // If no teacherId is linked, they shouldn't see classes
    } else {
      setClasses(allClasses);
    }
    setTeachers(await teachersStorage.getAll());
    setStudents(await studentsStorage.getAll());
  }, [isTeacher, user]);

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

  const openEdit = (cls: ClassItem) => {
    setEditingId(cls.id);
    setFormData({
      name: cls.name,
      subject: cls.subject,
      teacherId: cls.teacherId,
      room: cls.room,
      maxCapacity: cls.maxCapacity,
      status: cls.status,
      color: cls.color || '#06b6d4',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await classesStorage.delete(id);
    setDeleteConfirm(null);
    loadData();
  };

  const toggleEnrollment = async (studentId: string) => {
    if (!enrollmentClass) return;

    const student = await studentsStorage.getById(studentId);
    if (!student) return;

    const isEnrolled = enrollmentClass.enrolledStudentIds.includes(studentId);
    
    // Update Class
    const newEnrolledIds = isEnrolled
      ? enrollmentClass.enrolledStudentIds.filter(id => id !== studentId)
      : [...enrollmentClass.enrolledStudentIds, studentId];
      
    const updatedClass = await classesStorage.update(enrollmentClass.id, { enrolledStudentIds: newEnrolledIds });
    setEnrollmentClass(updatedClass);

    // Update Student
    const newStudentClasses = isEnrolled
      ? (student.enrolledClassIds || []).filter(id => id !== enrollmentClass.id)
      : [...(student.enrolledClassIds || []), enrollmentClass.id];
      
    await studentsStorage.update(studentId, { enrolledClassIds: newStudentClasses });
    
    loadData();
  };

  const teacherMap = new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

  const columns: ColumnDef<ClassItem>[] = [
    {
      key: 'name',
      label: t('classes'),
      sortable: true,
      render: (item) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color || '#06b6d4' }}></span>
          {item.name}
        </span>
      )
    },
    { key: 'subject', label: t('subject'), sortable: true },
    {
      key: 'teacher',
      label: t('teacher'),
      render: (item) => teacherMap.get(item.teacherId) || '-'
    },
    { key: 'room', label: t('room'), sortable: true },
    {
      key: 'capacity',
      label: t('enrolled_students'),
      render: (item) => `${item.enrolledStudentIds.length} / ${item.maxCapacity}`
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (item) => (
        <span className={`badge badge-${item.status === 'active' ? 'success' : 'secondary'}`}>
          {t(item.status)}
        </span>
      )
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" size="sm" onClick={() => setEnrollmentClass(item)}>{t('manage_enrollment') || 'Enroll'}</Button>
          {isManagerOrAdmin && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>{t('edit')}</Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(item.id)}>{t('delete')}</Button>
            </>
          )}
        </div>
      )
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      maxCapacity: Number(formData.maxCapacity),
      status: formData.status as 'active' | 'archived',
      schedule: editingId ? ((await classesStorage.getById(editingId))?.schedule || []) : [],
      enrolledStudentIds: editingId ? ((await classesStorage.getById(editingId))?.enrolledStudentIds || []) : [],
    };

    if (editingId) {
      await classesStorage.update(editingId, payload);
    } else {
      const newClass = await classesStorage.create(payload);
      
      // Update teacher's assigned classes
      if (formData.teacherId) {
        const teacher = await teachersStorage.getById(formData.teacherId);
        if (teacher) {
          await teachersStorage.update(formData.teacherId, {
            assignedClassIds: [...(teacher.assignedClassIds || []), newClass.id]
          });
        }
      }
    }
    setIsModalOpen(false);
    loadData();
    setFormData({ ...emptyForm });
    setEditingId(null);
  };

  const teacherOptions = [
    { value: '', label: t('select_teacher') || 'Select Teacher' },
    ...teachers.filter(t => t.status === 'active').map(tItem => ({
      value: tItem.id,
      label: `${tItem.firstName} ${tItem.lastName}`
    }))
  ];

  const colorOptions = [
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#6366f1', label: 'Indigo' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ef4444', label: 'Red' },
  ];

  const availableStudents = students
    .filter(s => s.status === 'active' && 
      (s.firstName.toLowerCase().includes(enrollSearch.toLowerCase()) || 
       s.lastName.toLowerCase().includes(enrollSearch.toLowerCase()) ||
       s.grade.toLowerCase().includes(enrollSearch.toLowerCase())))
    .slice(0, 50); // limit to 50 for perf

  return (
    <div className="page-container animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{t('classes')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {classes.length} {t('class_count')}
          </p>
        </div>
        {isManagerOrAdmin && (
          <Button onClick={openAdd}>{t('add_class')}</Button>
        )}
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <DataTable data={classes} columns={columns} searchable searchPlaceholder={t('search')} pagination itemsPerPage={10} />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('edit_class') : t('add_class')}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('classes')} placeholder="e.g. 1A, Physics 101" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label={t('subject')} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
          </div>
          <Select label={t('teacher')} value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })} options={teacherOptions} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('room')} value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} required />
            <Input type="number" label={t('max_capacity')} value={formData.maxCapacity} onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })} min={1} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select label={t('status')} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={[{ value: 'active', label: t('active') }, { value: 'archived', label: t('inactive') }]} required />
            <div className="form-group">
              <label className="form-label">{t('class_color') || 'Class Color'}</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {colorOptions.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c.value,
                      border: formData.color === c.value ? '2px solid white' : '2px solid transparent',
                      boxShadow: formData.color === c.value ? '0 0 0 2px var(--bg-card)' : 'none',
                      cursor: 'pointer'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={t('confirm')}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{t('confirm_delete_class')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{t('delete')}</Button>
        </div>
      </Modal>

      {/* Enrollment Modal */}
      <Modal isOpen={!!enrollmentClass} onClose={() => setEnrollmentClass(null)} title={enrollmentClass ? `${t('manage_enrollment')} - ${enrollmentClass.name}` : ''}>
        {enrollmentClass && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {t('enrolled_students')}: <strong>{enrollmentClass.enrolledStudentIds.length} / {enrollmentClass.maxCapacity}</strong>
              </span>
            </div>
            
            <Input 
              placeholder={t('search_students')} 
              value={enrollSearch} 
              onChange={e => setEnrollSearch(e.target.value)} 
            />

            <div style={{ overflowY: 'auto', flex: 1, maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
              {availableStudents.map(student => {
                const isEnrolled = enrollmentClass.enrolledStudentIds.includes(student.id);
                const isFull = !isEnrolled && enrollmentClass.enrolledStudentIds.length >= enrollmentClass.maxCapacity;
                
                return (
                  <div key={student.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '0.75rem', background: isEnrolled ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.03)', 
                    border: `1px solid ${isEnrolled ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-subtle)'}`,
                    borderRadius: '8px' 
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{student.firstName} {student.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.grade}</div>
                    </div>
                    <Button 
                      variant={isEnrolled ? 'danger' : 'secondary'} 
                      size="sm" 
                      onClick={() => toggleEnrollment(student.id)}
                      disabled={isFull}
                    >
                      {isEnrolled ? (t('unenroll_student') || 'Remove') : (t('enroll_student') || 'Add')}
                    </Button>
                  </div>
                );
              })}
              {availableStudents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  {t('no_students')}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
