import { User, Student, Teacher, ClassItem, AttendanceRecord, Payment, Message, CenterSettings, RegistrationRequest, OtpCode } from './types';

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Hash a password using SHA-256 for security enhancement.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a deterministic login code.
 * Produces an 8-character alphanumeric code by hashing the input string.
 */
export function generateLoginCode(input: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1 + char) & 0xFFFFFFFF;
    hash2 = ((hash2 << 5) + hash2 + char) & 0xFFFFFFFF;
  }
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const combined = Math.abs(hash1).toString() + Math.abs(hash2).toString();
  
  for (let i = 0; i < 8; i++) {
    const idx = parseInt(combined.slice(i * 2, i * 2 + 2) || '0') % chars.length;
    code += chars[idx];
  }
  
  return code;
}

export function getWeeklyLoginCode(studentId: string): string {
  const now = new Date();
  // Get Monday of the current week (or just a week number)
  // Let's use ISO week number to be stable.
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  const weekString = `${d.getUTCFullYear()}-W${weekNo}`;
  
  return generateLoginCode(`${studentId}-${weekString}`);
}

export class StorageService<T extends { id: string; createdAt?: string; updatedAt?: string }> {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async getAll(): Promise<T[]> {
    try {
      const res = await fetch(this.endpoint);
      if (!res.ok) throw new Error('Failed to fetch data');
      return await res.json();
    } catch (error) {
      console.error(`Error fetching from ${this.endpoint}:`, error);
      return [];
    }
  }

  async getById(id: string): Promise<T | undefined> {
    try {
      const res = await fetch(`${this.endpoint}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch item');
      return await res.json();
    } catch (error) {
      console.error(`Error fetching item from ${this.endpoint}:`, error);
      return undefined;
    }
  }

  async create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to create item');
    const createdItem = await res.json();
    this.dispatchUpdate();
    return createdItem;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const res = await fetch(`${this.endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update item');
    const updatedItem = await res.json();
    this.dispatchUpdate();
    return updatedItem;
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${this.endpoint}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete item');
    this.dispatchUpdate();
  }

  private dispatchUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storage-update', { detail: { endpoint: this.endpoint } }));
    }
  }
}

export const usersStorage = new StorageService<User>('/api/users');
export const studentsStorage = new StorageService<Student>('/api/students');
export const teachersStorage = new StorageService<Teacher>('/api/teachers');
export const classesStorage = new StorageService<ClassItem>('/api/classes');
export const attendanceStorage = new StorageService<AttendanceRecord>('/api/attendance');
export const paymentsStorage = new StorageService<Payment>('/api/payments');
export const messagesStorage = new StorageService<Message>('/api/messages');
export const registrationRequestsStorage = new StorageService<RegistrationRequest>('/api/registration-requests');
export const otpStorage = new StorageService<OtpCode>('/api/otp');

export const settingsStorage = {
  async get(): Promise<CenterSettings | null> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return await res.json();
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  },
  async save(settings: CenterSettings): Promise<void> {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('storage-update', { detail: { endpoint: '/api/settings' } }));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
};
