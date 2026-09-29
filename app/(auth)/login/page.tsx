'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithCode, isAuthenticated, loading: authLoading, userRole } = useAuth();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'staff' | 'student'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && userRole) {
      if (userRole === 'student') {
        router.push('/schedule');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, userRole, router]);

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 8) {
      setError(t('password_too_short') || 'Password must be at least 8 characters long.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      if (!result.success) {
        if (result.error === 'use_code_login') {
          setError(t('use_code_login') || 'Students must use the Student Login tab with their secret code.');
        } else if (result.error === 'account_disabled') {
          setError(t('account_disabled') || 'Your account has been disabled. Contact an administrator.');
        } else {
          setError(t('invalid_credentials') || 'Invalid email or password');
        }
      }
    } catch {
      setError(t('login_error') || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.trim().length !== 8) {
      setError(t('invalid_code_length') || 'Secret code must be exactly 8 characters.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await loginWithCode(code.toUpperCase().trim());
      if (!result.success) {
        if (result.error === 'account_disabled') {
          setError(t('account_disabled') || 'Your account has been disabled.');
        } else {
          setError(t('invalid_code') || 'Invalid login code. Please check your code and try again.');
        }
      }
    } catch {
      setError(t('login_error') || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated || authLoading) {
    return (
      <div className="flex" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg-dark)' }}>
      <div className="glass-card animate-fadeIn" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '16px', 
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'white'
          }}>E</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {t('login') || 'Sign In'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('login_subtitle') || 'Access your education center account'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', marginBottom: '1.5rem', 
          background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setError(''); }}
            style={{
              flex: 1, padding: '0.65rem 1rem', border: 'none', borderRadius: '10px',
              background: activeTab === 'staff' ? 'linear-gradient(135deg, #06b6d4, #6366f1)' : 'transparent',
              color: activeTab === 'staff' ? 'white' : 'var(--text-secondary)',
              fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('staff_login') || 'Staff Login'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('student'); setError(''); }}
            style={{
              flex: 1, padding: '0.65rem 1rem', border: 'none', borderRadius: '10px',
              background: activeTab === 'student' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'transparent',
              color: activeTab === 'student' ? 'white' : 'var(--text-secondary)',
              fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t('student_login') || 'Student Login'}
            </span>
          </button>
        </div>
        
        {/* Error */}
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
            padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', 
            fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Staff Login Form */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="flex animate-fadeIn" style={{ flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {t('email') || 'Email Address'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                title="Please enter a valid email address"
                className="glass-card"
                style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px' }}
                placeholder="admin@center.com"
              />
            </div>
            
            <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {t('password') || 'Password'}
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                title="Password must be at least 8 characters"
                className="glass-card"
                style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px' }}
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                marginTop: '0.5rem',
                padding: '0.75rem', 
                background: 'linear-gradient(135deg, #06b6d4, #6366f1)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.3s ease',
                fontSize: '0.95rem',
              }}
            >
              {isLoading ? (t('loading') || 'Signing in...') : (t('login') || 'Sign In')}
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Demo Credentials:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <p><span style={{ color: '#06b6d4' }}>Super Admin:</span> admin@center.com / admin123</p>
                <p><span style={{ color: '#8b5cf6' }}>Manager:</span> manager@center.com / manager123</p>
                <p><span style={{ color: '#f59e0b' }}>Teacher:</span> teacher@center.com / teacher123</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {t('want_to_register') || 'Want to join as a teacher?'}
              </p>
              <button
                type="button"
                onClick={() => router.push('/register?type=teacher')}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  color: '#06b6d4',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.875rem',
                }}
              >
                {t('register_as_teacher') || 'Register as Teacher'}
              </button>
            </div>
          </form>
        )}

        {/* Student Login Form */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} className="flex animate-fadeIn" style={{ flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ 
              textAlign: 'center', padding: '1rem', 
              background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              marginBottom: '0.5rem'
            }}>
              <svg width="32" height="32" fill="none" stroke="#10b981" viewBox="0 0 24 24" style={{ margin: '0 auto 0.5rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {t('student_login_hint') || 'Enter the secret code provided to you by the center administration.'}
              </p>
            </div>

            <div className="flex" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="loginCode" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {t('secret_code') || 'Secret Code'}
              </label>
              <input
                id="loginCode"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="glass-card"
                style={{ 
                  padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', 
                  background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '8px',
                  textAlign: 'center', letterSpacing: '0.3rem', fontSize: '1.2rem',
                  fontFamily: 'monospace', fontWeight: 'bold',
                }}
                placeholder="XXXXXXXX"
                minLength={8}
                maxLength={8}
                title="Code must be exactly 8 characters"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || code.length < 8}
              style={{ 
                marginTop: '0.5rem',
                padding: '0.75rem', 
                background: 'linear-gradient(135deg, #10b981, #06b6d4)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px',
                fontWeight: '600',
                cursor: (isLoading || code.length < 8) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || code.length < 8) ? 0.5 : 1,
                transition: 'all 0.3s ease',
                fontSize: '0.95rem',
              }}
            >
              {isLoading ? (t('loading') || 'Verifying...') : (t('login_with_code') || 'Login with Code')}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {t('no_code_yet') || "Don't have a code yet?"}
              </p>
              <button
                type="button"
                onClick={() => router.push('/register?type=student')}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  color: '#10b981',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.875rem',
                }}
              >
                {t('register_as_student') || 'Register as Student'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
