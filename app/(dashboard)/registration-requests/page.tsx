'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { registrationRequestsStorage, studentsStorage, teachersStorage, usersStorage, getWeeklyLoginCode, otpStorage, hashPassword } from '@/lib/storage';
import { RegistrationRequest, OtpCode } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';

export default function RegistrationRequestsPage() {
  const { t } = useTranslation();
  const { user, isManagerOrAdmin } = useAuth();
  
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [otps, setOtps] = useState<OtpCode[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [rejectModal, setRejectModal] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = async () => {
    setRequests(await registrationRequestsStorage.getAll());
    setOtps(await otpStorage.getAll());
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

  const handleApprove = async (request: RegistrationRequest) => {
    if (!user) return;

    const approvalTime = new Date().toISOString();

    if (request.role === 'teacher') {
      // Create Teacher record
      const teacher = await teachersStorage.create({
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email!,
        phone: request.phone!,
        specialization: request.specialization || '',
        assignedClassIds: [],
        status: 'active',
        hireDate: approvalTime,
      } as any);

      // Hash password before saving for security enhancement
      const hashedPassword = await hashPassword(request.password || '');

      // Create User record for teacher
      const teacherUser = await usersStorage.create({
        email: request.email,
        password: hashedPassword,
        firstName: request.firstName,
        lastName: request.lastName,
        role: 'teacher',
        phone: request.phone,
        teacherId: teacher.id,
        isActive: true,
      } as any);

      // Link teacher to user
      await teachersStorage.update(teacher.id, { userId: teacherUser.id } as any);

      // Update request
      await registrationRequestsStorage.update(request.id, {
        status: 'approved',
        approvedBy: user.id,
        approvedAt: approvalTime,
        teacherId: teacher.id,
        userId: teacherUser.id,
      } as any);

      setSelectedRequest(request);
      loadData();
      showToast(t('registration_approved') || 'Teacher registration approved successfully!', 'success');
      return;
    }

    // Create Student record
    const student = await studentsStorage.create({
      firstName: request.firstName,
      lastName: request.lastName,
      dateOfBirth: request.dateOfBirth,
      gender: request.gender,
      grade: request.grade,
      enrolledClassIds: [],
      parentName: request.parentName,
      parentPhone: request.parentPhone,
      parentEmail: request.parentEmail,
      address: request.address,
      status: 'active',
    } as any);

    // Create User record for the student
    const studentUser = await usersStorage.create({
      firstName: request.firstName,
      lastName: request.lastName,
      role: 'student',
      studentId: student.id,
      isActive: true,
    } as any);
    
    // Generate the weekly login code based on the new user's ID
    const loginCode = getWeeklyLoginCode(studentUser.id);
    
    // Save it to user for backward compatibility or immediate display
    await usersStorage.update(studentUser.id, { loginCode } as any);

    // Link student to user
    await studentsStorage.update(student.id, { userId: studentUser.id } as any);

    // Update registration request
    await registrationRequestsStorage.update(request.id, {
      status: 'approved',
      approvedBy: user.id,
      approvedAt: approvalTime,
      loginCode: loginCode,
      studentId: student.id,
      userId: studentUser.id,
    } as any);

    setGeneratedCode(loginCode);
    setSelectedRequest(request);
    setShowCodeModal(true);
    loadData();
    showToast(t('registration_approved') || 'Registration approved successfully!', 'success');
  };

  const handleReject = async () => {
    if (!user || !rejectModal) return;

    await registrationRequestsStorage.update(rejectModal.id, {
      status: 'rejected',
      rejectedBy: user.id,
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejectionReason,
    } as any);

    setRejectModal(null);
    setRejectionReason('');
    loadData();
    showToast(t('registration_rejected') || 'Registration rejected.', 'info');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  if (!isManagerOrAdmin) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const renderRequestCard = (req: RegistrationRequest, showActions: boolean) => (
    <div key={req.id} style={{ 
      padding: '1.25rem', borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border-subtle)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {req.firstName} {req.lastName}
            <span style={{ 
              fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', 
              background: req.role === 'teacher' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: req.role === 'teacher' ? '#06b6d4' : '#10b981',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {req.role === 'teacher' ? (t('teacher') || 'Teacher') : (t('student') || 'Student')}
            </span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            {new Date(req.createdAt || Date.now()).toLocaleDateString()} · {new Date(req.createdAt || Date.now()).toLocaleTimeString()}
          </span>
        </div>
        <span className={`badge badge-${req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'error'}`}>
          {req.status === 'pending' ? (t('pending') || 'Pending') : 
           req.status === 'approved' ? (t('approved') || 'Approved') : (t('rejected') || 'Rejected')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {req.role === 'student' ? (
          <>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('date_of_birth') || 'DOB'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.dateOfBirth}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('gender') || 'Gender'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.gender === 'male' ? (t('male') || 'Male') : (t('female') || 'Female')}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('grade') || 'Grade'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.grade}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('parent_name') || 'Parent'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.parentName}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('phone') || 'Phone'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.parentPhone}</p>
            </div>
            {req.parentEmail && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('email') || 'Email'}</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.parentEmail}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('email') || 'Email'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.email}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('phone') || 'Phone'}</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.phone}</p>
            </div>
            {req.specialization && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('specialization') || 'Specialization'}</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.specialization}</p>
              </div>
            )}
          </>
        )}
      </div>

      {req.status === 'approved' && req.loginCode && (
        <div style={{ 
          padding: '0.75rem', borderRadius: '8px', 
          background: 'rgba(16, 185, 129, 0.08)', 
          border: '1px solid rgba(16, 185, 129, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>{t('login_code') || 'Login Code'}</span>
            <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.15em', color: 'white' }}>{req.loginCode}</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(req.loginCode || ''); showToast('Code copied!', 'success'); }}
            style={{
              padding: '0.4rem 0.75rem', background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px',
              color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500'
            }}
          >
            {t('copy') || 'Copy'}
          </button>
        </div>
      )}

      {req.status === 'rejected' && req.rejectionReason && (
        <div style={{ 
          padding: '0.75rem', borderRadius: '8px', 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.15)',
          marginBottom: '0.5rem',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>{t('reason') || 'Reason'}</span>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.rejectionReason}</p>
        </div>
      )}

      {showActions && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button 
            variant="ghost" 
            onClick={() => setRejectModal(req)}
            style={{ color: '#ef4444' }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '0.4rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('reject') || 'Reject'}
          </Button>
          <Button onClick={() => handleApprove(req)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '0.4rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('approve') || 'Approve'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(toasts.filter(t => t.id !== id))} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{t('registration_requests') || 'Registration Requests'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('registration_requests_desc') || 'Review and approve student registration requests'}
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <div style={{
            padding: '0.5rem 1rem', borderRadius: '20px',
            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
            color: '#f59e0b', fontWeight: '600', fontSize: '0.9rem',
          }}>
            {pendingRequests.length} {t('pending') || 'Pending'}
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', minHeight: '400px' }}>
        <Tabs>
          <Tab id="pending_students" label={`Pending Students (${pendingRequests.filter(r => r.role === 'student').length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {pendingRequests.filter(r => r.role === 'student').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('no_pending_requests') || 'No pending student requests'}
                </div>
              ) : (
                pendingRequests.filter(r => r.role === 'student').map(req => renderRequestCard(req, true))
              )}
            </div>
          </Tab>
          <Tab id="pending_teachers" label={`Pending Teachers (${pendingRequests.filter(r => r.role === 'teacher').length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {pendingRequests.filter(r => r.role === 'teacher').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('no_pending_requests') || 'No pending teacher requests'}
                </div>
              ) : (
                pendingRequests.filter(r => r.role === 'teacher').map(req => renderRequestCard(req, true))
              )}
            </div>
          </Tab>
          <Tab id="otp_codes" label={`OTP Codes (${otps.filter(o => o.status === 'pending').length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {otps.filter(o => o.status === 'pending').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No pending OTP codes
                </div>
              ) : (
                otps.filter(o => o.status === 'pending').map(otp => (
                  <div key={otp.id} style={{ 
                    padding: '1.25rem', borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {otp.email}
                        <span style={{ 
                          fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', 
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          {otp.purpose.replace('_', ' ')}
                        </span>
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        Requested at: {new Date(otp.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.2em', color: '#10b981', margin: '0 0 0.5rem 0' }}>
                        {otp.code}
                      </p>
                      <span className="badge badge-warning">Pending</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Tab>
          <Tab id="approved" label={`${t('approved') || 'Approved'} (${approvedRequests.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {approvedRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  {t('no_approved_requests') || 'No approved requests yet'}
                </div>
              ) : (
                approvedRequests.map(req => renderRequestCard(req, false))
              )}
            </div>
          </Tab>
          <Tab id="rejected" label={`${t('rejected') || 'Rejected'} (${rejectedRequests.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {rejectedRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  {t('no_rejected_requests') || 'No rejected requests'}
                </div>
              ) : (
                rejectedRequests.map(req => renderRequestCard(req, false))
              )}
            </div>
          </Tab>
        </Tabs>
      </div>

      {/* Code Generated Modal */}
      <Modal isOpen={showCodeModal} onClose={() => { setShowCodeModal(false); setCopiedCode(false); }} title={t('registration_approved') || 'Registration Approved'}>
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'rgba(16, 185, 129, 0.15)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <svg width="32" height="32" fill="none" stroke="#10b981" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {selectedRequest?.firstName} {selectedRequest?.lastName}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {t('student_approved_message') || 'Student account created successfully. Share this login code privately:'}
          </p>

          <div style={{ 
            padding: '1.5rem', borderRadius: '12px', 
            background: 'rgba(16, 185, 129, 0.08)', 
            border: '2px dashed rgba(16, 185, 129, 0.3)',
            marginBottom: '1.5rem',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('secret_login_code') || 'Secret Login Code'}
            </span>
            <p style={{ 
              fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', 
              letterSpacing: '0.3em', color: 'white', marginTop: '0.5rem' 
            }}>
              {generatedCode}
            </p>
          </div>

          <button
            onClick={copyCode}
            style={{
              padding: '0.6rem 1.5rem',
              background: copiedCode ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #10b981, #06b6d4)',
              border: 'none', borderRadius: '8px',
              color: 'white', fontWeight: '600', cursor: 'pointer',
              fontSize: '0.9rem', transition: 'all 0.3s ease',
            }}
          >
            {copiedCode ? '✓ Copied!' : (t('copy_code') || 'Copy Code')}
          </button>

          <p style={{ 
            marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)',
            padding: '0.75rem', background: 'rgba(245, 158, 11, 0.06)',
            borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.12)',
          }}>
            ⚠️ {t('code_warning') || 'This code is private. Share it securely with the student via the Messages page.'}
          </p>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectionReason(''); }} title={t('reject_registration') || 'Reject Registration'}>
        <div style={{ padding: '1rem' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            {t('reject_confirm') || 'Are you sure you want to reject this registration?'}
            {rejectModal && <strong style={{ display: 'block', marginTop: '0.5rem' }}>{rejectModal.firstName} {rejectModal.lastName}</strong>}
          </p>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              {t('rejection_reason') || 'Reason (optional)'}
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="form-input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              placeholder={t('rejection_reason_placeholder') || 'Enter a reason for rejection...'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="ghost" onClick={() => { setRejectModal(null); setRejectionReason(''); }}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleReject} style={{ background: '#ef4444' }}>
              {t('reject') || 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
