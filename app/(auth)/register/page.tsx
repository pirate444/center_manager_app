'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { registrationRequestsStorage } from '@/lib/storage';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><p>Loading...</p></div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpValid, setIsOtpValid] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  
  const [registrationType, setRegistrationType] = useState<'student' | 'teacher'>(() => {
    const type = searchParams.get('type');
    return type === 'teacher' ? 'teacher' : 'student';
  });
  const [formData, setFormData] = useState({
    // Shared
    firstName: '',
    lastName: '',
    address: '',
    // Student specific
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female',
    grade: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    // Teacher specific
    email: '',
    password: '',
    phone: '',
    specialization: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registrationType === 'teacher' && !isOtpValid) {
      setOtpMessage('Please verify your OTP before submitting.');
      return;
    }
    if (registrationType === 'teacher' && formData.password.length < 8) {
      setOtpMessage('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);

    try {
      const payload: any = {
        role: registrationType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address || undefined,
        status: 'pending',
      };

      if (registrationType === 'student') {
        Object.assign(payload, {
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          grade: formData.grade,
          parentName: formData.parentName,
          parentPhone: formData.parentPhone,
          parentEmail: formData.parentEmail || undefined,
        });
      } else {
        Object.assign(payload, {
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          specialization: formData.specialization || undefined,
        });
      }

      await registrationRequestsStorage.create(payload);

      setIsSubmitted(true);
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequestOtp = async () => {
    if (!formData.email) {
      setOtpMessage(t('enter_email_first') || 'Please enter your email first.');
      return;
    }
    setIsRequestingOtp(true);
    setOtpMessage('');
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, purpose: 'teacher_registration' })
      });
      if (res.ok) {
        setOtpMessage(t('otp_requested') || 'OTP code requested. Admins will provide it to you.');
      } else {
        const data = await res.json();
        setOtpMessage(data.error || 'Failed to request OTP.');
      }
    } catch (e) {
      setOtpMessage('Failed to request OTP.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.email || !otpCode) {
      setOtpMessage(t('enter_email_otp') || 'Please enter your email and OTP code.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpMessage('');
    try {
      const res = await fetch('/api/otp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: otpCode, purpose: 'teacher_registration' })
      });
      if (res.ok) {
        setIsOtpValid(true);
        setOtpMessage(t('otp_verified') || 'OTP verified successfully!');
      } else {
        const data = await res.json();
        setOtpMessage(data.error || 'Invalid OTP code.');
      }
    } catch (e) {
      setOtpMessage('Failed to verify OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg-dark)' }}>
        <div className="glass-card animate-fadeIn" style={{ width: '100%', maxWidth: '480px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ 
            width: '72px', height: '72px', borderRadius: '50%', 
            background: 'rgba(16, 185, 129, 0.15)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '2px solid rgba(16, 185, 129, 0.3)',
          }}>
            <svg width="36" height="36" fill="none" stroke="#10b981" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#10b981' }}>
            {t('registration_submitted') || 'Registration Submitted!'}
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {registrationType === 'student' 
              ? (t('registration_pending_message') || 'Your registration request has been submitted successfully. The center administration will review your request and provide you with a secret login code once approved.')
              : (t('teacher_registration_pending') || 'Your teacher registration has been submitted. You will be able to log in with your email and password once approved.')}
          </p>

          {registrationType === 'student' && (
          <div style={{ 
            padding: '1rem', borderRadius: '12px', 
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            marginBottom: '2rem'
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" fill="none" stroke="#6366f1" viewBox="0 0 24 24" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('registration_code_info') || 'Your login code will be shared with you by the center staff. Keep it private and secure.'}
            </p>
          </div>
          )}

          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
            }}
          >
            {t('back_to_login') || 'Back to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg-dark)' }}>
      <div className="glass-card animate-fadeIn" style={{ width: '100%', maxWidth: '560px', padding: '2.5rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '16px', 
            background: 'linear-gradient(135deg, #10b981, #06b6d4)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {registrationType === 'student' ? (t('student_registration') || 'Student Registration') : (t('teacher_registration') || 'Teacher Registration')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('registration_subtitle') || 'Fill in the details below to register for the education center'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
          
          {/* Personal Info Section */}
          <div style={{ 
            padding: '0.75rem 1rem', borderRadius: '8px', 
            background: 'rgba(6, 182, 212, 0.06)', 
            border: '1px solid rgba(6, 182, 212, 0.12)',
            fontSize: '0.8rem', fontWeight: '600', color: '#06b6d4',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            {t('personal_info') || 'Personal Information'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                {t('first_name') || 'First Name'} *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
                className="glass-card"
                style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                {t('last_name') || 'Last Name'} *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
                className="glass-card"
                style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {registrationType === 'student' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('date_of_birth') || 'Date of Birth'} *
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    required
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('gender') || 'Gender'} *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    required
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="male">{t('male') || 'Male'}</option>
                    <option value="female">{t('female') || 'Female'}</option>
                  </select>
                </div>
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {t('grade') || 'Grade / Level'} *
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  required
                  className="glass-card"
                  style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  placeholder={t('grade_placeholder') || 'e.g. Middle School Year 1'}
                />
              </div>

              {/* Parent Info Section */}
              <div style={{ 
                padding: '0.75rem 1rem', borderRadius: '8px', 
                background: 'rgba(139, 92, 246, 0.06)', 
                border: '1px solid rgba(139, 92, 246, 0.12)',
                fontSize: '0.8rem', fontWeight: '600', color: '#8b5cf6',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginTop: '0.5rem',
              }}>
                {t('parent_info') || 'Parent / Guardian Information'}
              </div>

              <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {t('parent_name') || 'Parent / Guardian Name'} *
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => updateField('parentName', e.target.value)}
                  required
                  className="glass-card"
                  style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('parent_phone') || 'Phone Number'} *
                  </label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => updateField('parentPhone', e.target.value)}
                    required
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('parent_email') || 'Email'} <span style={{ color: 'var(--text-tertiary)' }}>({t('optional') || 'optional'})</span>
                  </label>
                  <input
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => updateField('parentEmail', e.target.value)}
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Account Info Section */}
              <div style={{ 
                padding: '0.75rem 1rem', borderRadius: '8px', 
                background: 'rgba(139, 92, 246, 0.06)', 
                border: '1px solid rgba(139, 92, 246, 0.12)',
                fontSize: '0.8rem', fontWeight: '600', color: '#8b5cf6',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginTop: '0.5rem',
              }}>
                {t('account_info') || 'Account Information'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('email') || 'Email Address'} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                    pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                    title="Please enter a valid email address"
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('password') || 'Password'} *
                  </label>
                  <PasswordInput
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required
                    minLength={8}
                    title="Password must be at least 8 characters"
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* OTP Validation Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {t('admin_otp_code') || 'Admin OTP Code'} *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    disabled={isOtpValid}
                    className="glass-card"
                    placeholder="Enter 6-digit code"
                    style={{ flex: 1, padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                  {!isOtpValid ? (
                    <>
                      <button 
                        type="button" 
                        onClick={handleRequestOtp}
                        disabled={isRequestingOtp || !formData.email}
                        style={{ padding: '0 1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        {isRequestingOtp ? '...' : (t('request_otp') || 'Request OTP')}
                      </button>
                      <button 
                        type="button" 
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || !otpCode}
                        style={{ padding: '0 1rem', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        {isVerifyingOtp ? '...' : (t('verify') || 'Verify')}
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '0.25rem' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {t('verified') || 'Verified'}
                    </div>
                  )}
                </div>
                {otpMessage && (
                  <div style={{ fontSize: '0.8rem', color: isOtpValid ? '#10b981' : 'var(--error)' }}>
                    {otpMessage}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('phone') || 'Phone Number'} *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    required
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {t('specialization') || 'Specialization'}
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => updateField('specialization', e.target.value)}
                    className="glass-card"
                    style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
                    placeholder="e.g. Mathematics"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex" style={{ flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
              {t('address') || 'Address'} <span style={{ color: 'var(--text-tertiary)' }}>({t('optional') || 'optional'})</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="glass-card"
              style={{ padding: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
              }}
            >
              {t('back_to_login') || 'Back to Login'}
            </button>
            <button 
              type="submit" 
              disabled={isLoading || (registrationType === 'teacher' && !isOtpValid)}
              style={{ 
                flex: 2,
                padding: '0.75rem', 
                background: 'linear-gradient(135deg, #10b981, #06b6d4)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px',
                fontWeight: '600',
                cursor: (isLoading || (registrationType === 'teacher' && !isOtpValid)) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || (registrationType === 'teacher' && !isOtpValid)) ? 0.7 : 1,
                transition: 'all 0.3s ease',
                fontSize: '0.95rem',
              }}
            >
              {isLoading ? (t('loading') || 'Submitting...') : (t('submit_registration') || 'Submit Registration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
