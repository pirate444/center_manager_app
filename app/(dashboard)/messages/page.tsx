'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { messagesStorage, studentsStorage, classesStorage } from '@/lib/storage';
import { Message, Student, ClassItem } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { Tabs, Tab } from '@/components/ui/Tabs';

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user, isManagerOrAdmin, isStudent } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [formData, setFormData] = useState({
    recipientType: 'student' as 'student' | 'class' | 'all',
    recipientId: '',
    subject: '',
    body: '',
    channel: 'in_app' as 'sms' | 'email' | 'in_app'
  });

  const templates = [
    { title: 'Absence Notice', subject: 'Notice of Absence', body: 'Dear Parent, your child was marked absent today.' },
    { title: 'Payment Reminder', subject: 'Payment Due Reminder', body: 'This is a friendly reminder that a payment is due.' },
    { title: 'Event Invitation', subject: 'Upcoming Event', body: 'We invite you to our upcoming school event.' },
    { title: 'General Notice', subject: 'General Announcement', body: 'Important announcement: ' }
  ];

  const loadData = async () => {
    setMessages(await messagesStorage.getAll());
    setStudents(await studentsStorage.getAll());
    setClasses(await classesStorage.getAll());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let targetStudentIds: string[] = [];
    
    if (formData.recipientType === 'student') {
      targetStudentIds = [formData.recipientId];
    } else if (formData.recipientType === 'class') {
      const cls = classes.find(c => c.id === formData.recipientId);
      if (cls) targetStudentIds = cls.enrolledStudentIds;
    } else {
      targetStudentIds = students.map(s => s.id);
    }

    if (targetStudentIds.length === 0) {
      showToast(t('no_recipients') || 'No recipients selected', 'error');
      return;
    }

    await messagesStorage.create({
      senderId: user.id,
      senderRole: user.role,
      recipientIds: targetStudentIds,
      subject: formData.subject,
      body: formData.body,
      channel: formData.channel,
      status: 'sent',
      read: false,
      sentAt: new Date().toISOString()
    } as any);

    showToast(t('message_sent') || 'Message sent successfully', 'success');
    setIsModalOpen(false);
    loadData();
    setFormData({
      recipientType: 'student',
      recipientId: '',
      subject: '',
      body: '',
      channel: 'in_app'
    });
  };

  const applyTemplate = (template: typeof templates[0]) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      body: template.body
    }));
  };

  const markAsRead = async (msgId: string) => {
    await messagesStorage.update(msgId, { read: true });
    loadData();
  };

  if (!user) return null;

  // Filter messages based on role
  let inboxMessages: Message[] = [];
  let sentMessages: Message[] = [];

  if (isManagerOrAdmin) {
    sentMessages = messages.filter(m => m.senderId === user.id || m.senderRole === 'super_admin' || m.senderRole === 'center_manager');
    // For admin, inbox could show replies if implemented, but we don't have replies yet.
  } else if (isStudent) {
    inboxMessages = messages.filter(m => {
      // Check if student's ID is in recipientIds
      return user.studentId && m.recipientIds.includes(user.studentId);
    });
  } else {
    // Teacher: maybe inbox if we allow admins to message teachers, but currently none.
    inboxMessages = messages.filter(m => user.teacherId && m.recipientIds.includes(user.teacherId));
  }

  // Sort by date
  inboxMessages.sort((a, b) => new Date(b.sentAt || Date.now()).getTime() - new Date(a.sentAt || Date.now()).getTime());
  sentMessages.sort((a, b) => new Date(b.sentAt || Date.now()).getTime() - new Date(a.sentAt || Date.now()).getTime());

  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">{t('messages')}</h1>
        {isManagerOrAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {t('compose')}
          </Button>
        )}
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', minHeight: '400px' }}>
        <Tabs>
          {/* Inbox Tab - mostly for students/teachers */}
          <Tab id="inbox" label={`${t('inbox') || 'Inbox'} ${inboxMessages.filter(m => !m.read).length > 0 ? `(${inboxMessages.filter(m => !m.read).length})` : ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {inboxMessages.map(msg => (
                <div key={msg.id} style={{ 
                  padding: '1.25rem', 
                  borderRadius: 'var(--border-radius-md)',
                  background: msg.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(16, 185, 129, 0.08)',
                  border: msg.read ? '1px solid var(--border-subtle)' : '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                      {!msg.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: '0.5rem' }}></span>}
                      {msg.subject}
                    </h3>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      {new Date(msg.sentAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {msg.body}
                  </p>
                  {!msg.read && (
                    <Button variant="ghost" onClick={() => markAsRead(msg.id)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                      {t('mark_as_read') || 'Mark as Read'}
                    </Button>
                  )}
                </div>
              ))}
              {inboxMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  {t('no_messages') || 'No messages'}
                </div>
              )}
            </div>
          </Tab>

          {/* Sent Tab - for admins/managers */}
          {isManagerOrAdmin && (
            <Tab id="sent" label={t('sent_messages') || 'Sent Messages'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {sentMessages.map(msg => (
                  <div key={msg.id} style={{ 
                    padding: '1.25rem', 
                    borderRadius: 'var(--border-radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{msg.subject}</h3>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                        {new Date(msg.sentAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', gap: '1rem', color: 'var(--text-secondary)' }}>
                      <span><strong>To:</strong> {msg.recipientIds.length} recipient(s)</span>
                      <span><strong>Via:</strong> {msg.channel.toUpperCase()}</span>
                      <span className={`badge badge-success`}>Sent</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {msg.body}
                    </p>
                  </div>
                ))}
                {sentMessages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    {t('no_messages') || 'No messages sent yet'}
                  </div>
                )}
              </div>
            </Tab>
          )}
        </Tabs>
      </div>

      {isManagerOrAdmin && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('compose_message')}>
          <div style={{ display: 'flex', gap: '1.5rem', minHeight: '500px' }}>
            
            {/* Templates Sidebar */}
            <div style={{ width: '200px', borderRight: '1px solid var(--border-subtle)', paddingRight: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                {t('templates') || 'Templates'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {templates.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                      color: 'var(--text-primary)'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Select
                  label={t('recipient_type') || 'Recipient Type'}
                  value={formData.recipientType}
                  onChange={(e) => setFormData({ ...formData, recipientType: e.target.value as any, recipientId: '' })}
                  options={[
                    { value: 'student', label: t('single_student') || 'Single Student' },
                    { value: 'class', label: t('entire_class') || 'Entire Class' },
                    { value: 'all', label: t('all_students') || 'All Students' }
                  ]}
                />
                
                {formData.recipientType === 'student' && (
                  <Select
                    label={t('students')}
                    value={formData.recipientId}
                    onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                    options={[
                      { value: '', label: t('select_student') || 'Select Student' },
                      ...students.filter(s => s.status === 'active').map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))
                    ]}
                    required
                  />
                )}
                
                {formData.recipientType === 'class' && (
                  <Select
                    label={t('classes')}
                    value={formData.recipientId}
                    onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                    options={[
                      { value: '', label: t('select_class') || 'Select Class' },
                      ...classes.filter(c => c.status === 'active').map(c => ({ value: c.id, label: c.name }))
                    ]}
                    required
                  />
                )}
              </div>

              <Select
                label={t('channel') || 'Channel'}
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                options={[
                  { value: 'in_app', label: 'In-App Notification' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'email', label: 'Email' }
                ]}
              />

              <Input
                label={t('subject')}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />

              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">{t('message')}</label>
                <textarea
                  className="form-input"
                  style={{ flex: 1, minHeight: '150px', resize: 'vertical' }}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                <Button type="submit">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {t('send')}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
