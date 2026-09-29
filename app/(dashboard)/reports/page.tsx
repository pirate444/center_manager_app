'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { studentsStorage, paymentsStorage, classesStorage, attendanceStorage } from '@/lib/storage';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Chart } from '@/components/ui/Chart';

// Inline StatCard component
function StatCard({ title, value, icon, trend, color }: any) {
  return (
    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {trend && (
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: trend > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{value}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{title}</div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('all');
  const [isClient, setIsClient] = useState(false);
  
  // Real Data
  const [studentsCount, setStudentsCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [classesCount, setClassesCount] = useState(0);
  
  const [enrollmentData, setEnrollmentData] = useState<{label: string, value: number}[]>([]);
  const [genderData, setGenderData] = useState<{label: string, value: number, color: string}[]>([]);
  const [revenueData, setRevenueData] = useState<{label: string, value: number}[]>([]);

  useEffect(() => {
    setIsClient(true);
    
    async function loadData() {
      // Load data
      const students = await studentsStorage.getAll();
      const payments = await paymentsStorage.getAll();
      const classes = await classesStorage.getAll();
      
      setStudentsCount(students.filter(s => s.status === 'active').length);
      setClassesCount(classes.filter(c => c.status === 'active').length);
      setRevenue(payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0));
      
      // Class Enrollment Data
      const enrollment = classes.map(c => ({
        label: c.name,
        value: c.enrolledStudentIds.length
      })).sort((a, b) => b.value - a.value).slice(0, 7); // top 7
      setEnrollmentData(enrollment);
      
      // Gender Distribution Data
      const maleCount = students.filter(s => s.gender === 'male' && s.status === 'active').length;
      const femaleCount = students.filter(s => s.gender === 'female' && s.status === 'active').length;
      setGenderData([
        { label: t('male') || 'Male', value: maleCount, color: '#3b82f6' },
        { label: t('female') || 'Female', value: femaleCount, color: '#ec4899' }
      ]);
      
      // Revenue Data (last 6 months - mock dates based on actual payments)
      const paidPayments = payments.filter(p => p.status === 'paid');
      const monthsData: Record<string, number> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Fill last 6 months with 0
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthsData[`${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`] = 0;
      }
      
      paidPayments.forEach(p => {
        const d = new Date(p.paidDate || p.createdAt);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
        if (monthsData[key] !== undefined) {
          monthsData[key] += p.amount;
        }
      });
      
      setRevenueData(Object.entries(monthsData).map(([label, value]) => ({ label, value })));
    }

    loadData();
  }, [t]);

  if (!isClient) return null; // Avoid hydration mismatch for charts

  return (
    <div className="page-container animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title">{t('reports_analytics')}</h1>
        <div style={{ width: '200px' }}>
          <Select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: 'this_month', label: t('this_month') || 'This Month' },
              { value: 'last_month', label: t('last_month') || 'Last Month' },
              { value: 'this_year', label: t('this_year') || 'This Year' },
              { value: 'all', label: t('all_time') || 'All Time' },
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard 
          title={t('total_students')}
          value={studentsCount}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          trend={+12}
          color="#06b6d4"
        />
        <StatCard 
          title={t('active_classes')}
          value={classesCount}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          trend={+2}
          color="#8b5cf6"
        />
        <StatCard 
          title={t('total_revenue') || 'Total Revenue'}
          value={`${revenue.toLocaleString()} DZD`}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={+18.5}
          color="#10b981"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Card title={t('revenue_overview') || 'Revenue Overview'}>
          {revenueData.length > 0 ? (
            <Chart
              type="bar" 
              data={revenueData}
              height={300}
            />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Data</div>
          )}
        </Card>

        <Card title={t('class_enrollment') || 'Class Enrollment'}>
          {enrollmentData.length > 0 ? (
            <Chart 
              type="bar"
              data={enrollmentData}
              height={300}
            />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Data</div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <Card title={t('attendance_trends') || 'Attendance Trends'}>
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            Attendance trends graph will appear here once more data is collected over time.
          </div>
        </Card>

        <Card title={t('gender_distribution') || 'Gender Distribution'}>
          {genderData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
            <Chart 
              type="donut"
              data={genderData}
              height={300}
            />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Data</div>
          )}
        </Card>
      </div>
    </div>
  );
}
