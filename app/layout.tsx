import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export const metadata: Metadata = {
  title: 'Education Center Platform',
  description: 'Premium After-School Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: dir and lang are managed dynamically inside LanguageProvider
  return (
    <html lang="en" dir="ltr">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <div className="bg-gradient-mesh"></div>
              {children}
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
