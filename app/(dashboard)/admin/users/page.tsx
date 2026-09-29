'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usersStorage, teachersStorage, studentsStorage, hashPassword } from '@/lib/storage';
import { User, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  center_manager: 'Center Manager',
  teacher: 'Teacher',
  student: 'Student',
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: '#ef4444',
  center_manager: '#8b5cf6',
  teacher: '#f59e0b',
  student: '#10b981',
};

export default function UserManagementPage() {
  const { t } = useTranslation();
  const { user: currentUser, isSuperAdmin } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'teacher' as UserRole,
    phone: '',
  });

  const loadData = async () => {
    setUsers(await usersStorage.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'teacher', phone: '' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate email
    if (formData.email && users.some(u => u.email === formData.email)) {
      showToast('A user with this email already exists.', 'error');
      return;
    }

    const hashedPassword = await hashPassword(formData.password);

    const newUser = await usersStorage.create({
      email: formData.email,
      password: hashedPassword,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      phone: formData.phone,
      isActive: true,
    } as any);

    // If teacher, create a Teacher record too
    if (formData.role === 'teacher') {
      const teacher = await teachersStorage.create({
        userId: newUser.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        specialization: '',
        assignedClassIds: [],
        status: 'active',
        hireDate: new Date().toISOString(),
      } as any);
      await usersStorage.update(newUser.id, { teacherId: teacher.id } as any);
    }

    showToast(t('user_created') || 'User created successfully!', 'success');
    setIsCreateModalOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    await usersStorage.update(editUser.id, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email || undefined,
    } as any);

    // If user has a linked teacher, update that too
    if (editUser.teacherId) {
      await teachersStorage.update(editUser.teacherId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      } as any);
    }

    showToast(t('user_updated') || 'User updated successfully!', 'success');
    setEditUser(null);
    resetForm();
    loadData();
  };

  const handleToggleActive = async (userId: string) => {
    const targetUser = await usersStorage.getById(userId);
    if (!targetUser) return;
    if (targetUser.id === currentUser?.id) {
      showToast('Cannot disable your own account.', 'error');
      return;
    }
    await usersStorage.update(userId, { isActive: !targetUser.isActive } as any);
    loadData();
    showToast(targetUser.isActive ? 'User deactivated.' : 'User activated.', 'info');
  };

  const handleDelete = async (userId: string) => {
    const targetUser = await usersStorage.getById(userId);
    if (!targetUser) return;
    if (targetUser.id === currentUser?.id) {
      showToast('Cannot delete your own account.', 'error');
      return;
    }
    await usersStorage.delete(userId);
    loadData();
    showToast('User deleted.', 'info');
  };

  const openEditModal = (u: User) => {
    setEditUser(u);
    setFormData({
      email: u.email || '',
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phone: u.phone || '',
    });
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.loginCode || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!isSuperAdmin) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>This page is only accessible to the Super Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">{t('user_management') || 'User Management'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('user_management_desc') || 'Manage all user accounts and roles'}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          {t('create_user') || 'Create User'}
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {(['super_admin', 'center_manager', 'teacher', 'student'] as UserRole[]).map(role => (
          <div key={role} className="glass-card" style={{ padding: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ROLE_COLORS[role] }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '600' }}>
                {ROLE_LABELS[role]}
              </span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {users.filter(u => u.role === role).length}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search_users') || 'Search users...'}
          className="form-input"
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="form-input"
          style={{ width: '180px' }}
        >
          <option value="all">{t('all_roles') || 'All Roles'}</option>
          <option value="super_admin">Super Admin</option>
          <option value="center_manager">Center Manager</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* User List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '600' }}>{t('name') || 'Name'}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '600' }}>{t('role') || 'Role'}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '600' }}>{t('email') || 'Email / Code'}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '600' }}>{t('status') || 'Status'}</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '600' }}>{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '10px', 
                        background: `${ROLE_COLORS[u.role]}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: ROLE_COLORS[u.role], fontWeight: 'bold', fontSize: '0.9rem'
                      }}>
                        {u.firstName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{u.firstName} {u.lastName}</div>
                        {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{u.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem', borderRadius: '6px',
                      background: `${ROLE_COLORS[u.role]}15`,
                      color: ROLE_COLORS[u.role],
                      fontSize: '0.75rem', fontWeight: '600',
                    }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {u.role === 'student' ? (
                      <button
                        onClick={() => setShowCodeModal(u)}
                        style={{
                          padding: '0.2rem 0.5rem', background: 'rgba(16,185,129,0.1)',
                          border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px',
                          color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 'bold',
                        }}
                      >
                        {u.loginCode || '—'}
                      </button>
                    ) : (
                      u.email || '—'
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge badge-${u.isActive ? 'success' : 'error'}`}>
                      {u.isActive ? (t('active') || 'Active') : (t('disabled') || 'Disabled')}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEditModal(u)}
                        title={t('edit') || 'Edit'}
                        style={{
                          padding: '0.35rem', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          color: 'var(--text-secondary)', cursor: 'pointer'
                        }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                            style={{
                              padding: '0.35rem', background: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--border-subtle)', borderRadius: '6px',
                              color: u.isActive ? '#f59e0b' : '#10b981', cursor: 'pointer'
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {u.isActive ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            title={t('delete') || 'Delete'}
                            style={{
                              padding: '0.35rem', background: 'rgba(239,68,68,0.05)',
                              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
                              color: '#ef4444', cursor: 'pointer'
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    {t('no_users_found') || 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t('create_user') || 'Create User'}>
        <form onSubmit={handleCreate} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('first_name') || 'First Name'} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label={t('last_name') || 'Last Name'} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          <Select
            label={t('role') || 'Role'}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            options={[
              { value: 'center_manager', label: 'Center Manager' },
              { value: 'teacher', label: 'Teacher' },
            ]}
          />
          <Input label={t('email') || 'Email'} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <Input label={t('password') || 'Password'} type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
          <Input label={t('phone') || 'Phone'} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>{t('cancel') || 'Cancel'}</Button>
            <Button type="submit">{t('create') || 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); resetForm(); }} title={t('edit_user') || 'Edit User'}>
        <form onSubmit={handleEdit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label={t('first_name') || 'First Name'} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label={t('last_name') || 'Last Name'} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          {editUser?.role !== 'student' && (
            <Input label={t('email') || 'Email'} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          )}
          <Input label={t('phone') || 'Phone'} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" type="button" onClick={() => { setEditUser(null); resetForm(); }}>{t('cancel') || 'Cancel'}</Button>
            <Button type="submit">{t('save') || 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Code Modal */}
      <Modal isOpen={!!showCodeModal} onClose={() => setShowCodeModal(null)} title={t('student_login_code') || 'Student Login Code'}>
        {showCodeModal && (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>{showCodeModal.firstName} {showCodeModal.lastName}</h3>
            <div style={{ 
              padding: '1.5rem', borderRadius: '12px', 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '2px dashed rgba(16, 185, 129, 0.3)',
              margin: '1rem 0',
            }}>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', textTransform: 'uppercase' }}>Login Code</span>
              <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.3em', color: 'white', marginTop: '0.5rem' }}>
                {showCodeModal.loginCode || '—'}
              </p>
            </div>
            <Button onClick={() => { navigator.clipboard.writeText(showCodeModal.loginCode || ''); showToast('Code copied!', 'success'); }}>
              {t('copy_code') || 'Copy Code'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
