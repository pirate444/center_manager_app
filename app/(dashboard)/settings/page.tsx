'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { settingsStorage, usersStorage, hashPassword } from '@/lib/storage';
import { CenterSettings } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { user, isTeacher, isManagerOrAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState(() => 'language');
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Password reset state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    settingsStorage.get().then(setSettings);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      await settingsStorage.save(settings);
      showToast(t('settings_saved') || 'Settings saved successfully', 'success');
    }
  };

  const handleExport = async () => {
    try {
      const data = {
        users: await (await fetch('/api/users')).json(),
        students: await (await fetch('/api/students')).json(),
        teachers: await (await fetch('/api/teachers')).json(),
        classes: await (await fetch('/api/classes')).json(),
        payments: await (await fetch('/api/payments')).json(),
        attendance: await (await fetch('/api/attendance')).json(),
        messages: await (await fetch('/api/messages')).json(),
        settings: await (await fetch('/api/settings')).json(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ed_center_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export data', 'error');
    }
  };

  const handleReset = () => {
    showToast('Factory reset is disabled in the database-backed version.', 'info');
    setIsResetModalOpen(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!user) return;

    // Validate new password length
    if (newPassword.length < 8) {
      setPasswordError(t('password_too_short') || 'New password must be at least 8 characters long.');
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwords_dont_match') || 'New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Get current user data from the database
      const currentUserData = await usersStorage.getById(user.id);
      if (!currentUserData) {
        setPasswordError('User not found.');
        setIsChangingPassword(false);
        return;
      }

      // Verify current password (check against both hashed and plain for backward compat)
      const hashedCurrentInput = await hashPassword(currentPassword);
      if (currentUserData.password !== hashedCurrentInput && currentUserData.password !== currentPassword) {
        setPasswordError(t('current_password_incorrect') || 'Current password is incorrect.');
        setIsChangingPassword(false);
        return;
      }

      // Hash the new password and save
      const hashedNewPassword = await hashPassword(newPassword);
      await usersStorage.update(user.id, { password: hashedNewPassword } as any);

      showToast(t('password_changed') || 'Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('An error occurred while changing the password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">{t('settings')}</h1>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.nav}>
          {isManagerOrAdmin && (
          <button 
            className={`${styles.navItem} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {t('center_info') || 'Center Info'}
          </button>
          )}
          <button 
            className={`${styles.navItem} ${activeTab === 'language' ? styles.active : ''}`}
            onClick={() => setActiveTab('language')}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            {t('language') || 'Language'}
          </button>
          {isManagerOrAdmin && (
          <button 
            className={`${styles.navItem} ${activeTab === 'data' ? styles.active : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            {t('data_management') || 'Data Management'}
          </button>
          )}
          {(isTeacher || isManagerOrAdmin) && (
          <button 
            className={`${styles.navItem} ${activeTab === 'security' ? styles.active : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            {t('security') || 'Security'}
          </button>
          )}
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          
          {/* General Settings Tab — Admin Only */}
          {activeTab === 'general' && isManagerOrAdmin && settings && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('center_info') || 'Center Information'}</h2>
                <p className={styles.sectionDesc}>Update your institution's contact details and working hours.</p>
              </div>
              
              <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                  <Input 
                    label={t('center_name') || 'Center Name'} 
                    value={settings.centerName} 
                    onChange={e => setSettings({...settings, centerName: e.target.value})} 
                  />
                </div>
                
                <Input 
                  label={t('address')} 
                  value={settings.address} 
                  onChange={e => setSettings({...settings, address: e.target.value})} 
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <Input 
                    label={t('phone')} 
                    value={settings.phone} 
                    onChange={e => setSettings({...settings, phone: e.target.value})} 
                  />
                  <Input 
                    label={t('email')} 
                    type="email"
                    value={settings.email} 
                    onChange={e => setSettings({...settings, email: e.target.value})} 
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button type="submit">{t('save_changes') || 'Save Changes'}</Button>
                </div>
              </form>
            </div>
          )}

          {/* Language Tab */}
          {activeTab === 'language' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('language') || 'Language'}</h2>
                <p className={styles.sectionDesc}>Choose your preferred language. This will change the interface instantly.</p>
              </div>
              
              <div className={styles.langGrid}>
                <div 
                  className={`${styles.langCard} ${language === 'en' ? styles.active : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  <div className={styles.langIcon}>🇬🇧</div>
                  <div className={styles.langName}>English</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>LTR</div>
                </div>
                
                <div 
                  className={`${styles.langCard} ${language === 'fr' ? styles.active : ''}`}
                  onClick={() => setLanguage('fr' as any)}
                >
                  <div className={styles.langIcon}>🇫🇷</div>
                  <div className={styles.langName}>Français</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>LTR</div>
                </div>
              </div>
            </div>
          )}

          {/* Data Tab — Admin Only */}
          {activeTab === 'data' && isManagerOrAdmin && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('data_management') || 'Data Management'}</h2>
                <p className={styles.sectionDesc}>Export your data for backup or reset the application.</p>
              </div>
              
              <div className={styles.dataActions}>
                <div className={styles.dataCard}>
                  <div className={styles.dataCardInfo}>
                    <h4>Export Data</h4>
                    <p>Download all your data as a JSON file</p>
                  </div>
                  <Button variant="secondary" onClick={handleExport}>Export JSON</Button>
                </div>
                
                <div className={styles.dataCard}>
                  <div className={styles.dataCardInfo}>
                    <h4 style={{ color: 'var(--color-error)' }}>Factory Reset</h4>
                    <p>Delete all data and restore to default state. Admin accounts are preserved.</p>
                  </div>
                  <Button variant="danger" onClick={() => setIsResetModalOpen(true)}>Reset Data</Button>
                </div>
              </div>
            </div>
          )}

          {/* Security / Password Tab */}
          {activeTab === 'security' && (isTeacher || isManagerOrAdmin) && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('change_password') || 'Change Password'}</h2>
                <p className={styles.sectionDesc}>
                  {t('change_password_desc') || 'Enter your current password and choose a new one. Minimum 8 characters.'}
                </p>
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '480px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {t('current_password') || 'Current Password'} *
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    minLength={1}
                    className="form-input"
                    style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    placeholder="••••••••"
                  />
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--border-subtle)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {t('new_password') || 'New Password'} *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="form-input"
                    style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    placeholder="Min. 8 characters"
                  />
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                      {t('password_too_short') || 'Password must be at least 8 characters.'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {t('confirm_password') || 'Confirm New Password'} *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="form-input"
                    style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${confirmPassword.length > 0 && confirmPassword !== newPassword ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: 'white' }}
                    placeholder="Re-enter new password"
                  />
                  {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                      {t('passwords_dont_match') || 'Passwords do not match.'}
                    </span>
                  )}
                  {confirmPassword.length >= 8 && confirmPassword === newPassword && (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {t('passwords_match') || 'Passwords match.'}
                    </span>
                  )}
                </div>

                {passwordError && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem' }}>
                    {passwordError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Button
                    type="submit"
                    disabled={isChangingPassword || newPassword.length < 8 || confirmPassword !== newPassword}
                  >
                    {isChangingPassword ? (t('loading') || 'Saving...') : (t('change_password') || 'Change Password')}
                  </Button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Confirm Reset">
        <div style={{ color: 'var(--color-error)', marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-error-bg)', borderRadius: '8px', border: '1px solid var(--color-error-border)' }}>
          <strong>Warning:</strong> This action cannot be undone. All students, teachers, classes, payments, and attendance records will be permanently deleted.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={handleReset}>Yes, Reset Everything</Button>
        </div>
      </Modal>
    </div>
  );
}
