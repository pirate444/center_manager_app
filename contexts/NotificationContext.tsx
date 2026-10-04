'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface NotificationState {
  messages: boolean;
  resources: boolean;
  schedule: boolean;
}

interface NotificationContextType {
  notifications: NotificationState;
  clearNotification: (key: keyof NotificationState) => void;
  hasAnyNotification: boolean;
}

const STORAGE_KEY = 'notification_seen';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Stores the last-seen timestamps per section in localStorage.
 * When new data arrives (via storage-update events), we compare
 * against the last-seen time to decide whether to show a red dot.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationState>({
    messages: false,
    resources: false,
    schedule: false,
  });

  // Get the last-seen timestamps from localStorage
  const getSeenTimestamps = useCallback((): Record<string, number> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const saveSeenTimestamp = useCallback((key: string) => {
    const seen = getSeenTimestamps();
    seen[`${user?.id || 'anon'}_${key}`] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }, [user, getSeenTimestamps]);

  // Check for new items by comparing counts/data with last seen
  const checkNotifications = useCallback(async () => {
    if (!user) return;
    const seen = getSeenTimestamps();
    const userId = user.id;

    try {
      // Check messages
      const msgRes = await fetch('/api/messages');
      if (msgRes.ok) {
        const messages = await msgRes.json();
        const lastSeenMsg = seen[`${userId}_messages`] || 0;
        // Check if any message was created/sent after last seen
        const hasNewMsg = messages.some((m: any) => {
          const sentTime = new Date(m.sentAt || m.createdAt).getTime();
          // For students, check if they are a recipient
          if (user.role === 'student') {
            const isRecipient = (m.recipientIds || []).includes(user.studentId) || 
                                (m.recipientUserIds || []).includes(user.id);
            return isRecipient && sentTime > lastSeenMsg;
          }
          // For others, check if any message is newer
          return sentTime > lastSeenMsg;
        });
        setNotifications(prev => ({ ...prev, messages: hasNewMsg }));
      }

      // Check resources  
      const resRes = await fetch('/api/resources');
      if (resRes.ok) {
        const resources = await resRes.json();
        const lastSeenRes = seen[`${userId}_resources`] || 0;
        const hasNewRes = resources.some((r: any) => {
          const createdTime = new Date(r.createdAt || r.updatedAt).getTime();
          return createdTime > lastSeenRes;
        });
        setNotifications(prev => ({ ...prev, resources: hasNewRes }));
      }

      // Check schedule changes (classes with schedule data)
      const schedRes = await fetch('/api/classes');
      if (schedRes.ok) {
        const classes = await schedRes.json();
        const lastSeenSched = seen[`${userId}_schedule`] || 0;
        const hasNewSched = classes.some((c: any) => {
          const updatedTime = new Date(c.updatedAt).getTime();
          return updatedTime > lastSeenSched;
        });
        setNotifications(prev => ({ ...prev, schedule: hasNewSched }));
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [user, getSeenTimestamps]);

  // Initial check + listen for storage-update events
  useEffect(() => {
    if (!user) return;
    checkNotifications();

    const handleStorageUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.endpoint) {
        checkNotifications();
        return;
      }
      // Only re-check relevant endpoints
      if (detail.endpoint.includes('messages')) {
        checkNotifications();
      } else if (detail.endpoint.includes('resources')) {
        checkNotifications();
      } else if (detail.endpoint.includes('classes')) {
        checkNotifications();
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate);

    // Poll every 60 seconds for cross-tab/external changes
    const interval = setInterval(checkNotifications, 60000);

    return () => {
      window.removeEventListener('storage-update', handleStorageUpdate);
      clearInterval(interval);
    };
  }, [user, checkNotifications]);

  const clearNotification = useCallback((key: keyof NotificationState) => {
    setNotifications(prev => ({ ...prev, [key]: false }));
    saveSeenTimestamp(key);
  }, [saveSeenTimestamp]);

  const hasAnyNotification = notifications.messages || notifications.resources || notifications.schedule;

  return (
    <NotificationContext.Provider value={{ notifications, clearNotification, hasAnyNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
