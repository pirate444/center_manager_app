// User roles
export type UserRole = 'super_admin' | 'center_manager' | 'teacher' | 'student';

export interface User {
  id: string;
  email?: string; // Optional for students (they use loginCode)
  password?: string; // Optional for students
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  loginCode?: string; // For student login (generated on registration approval)
  studentId?: string; // Links to Student record (for student role)
  teacherId?: string; // Links to Teacher record (for teacher role)
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type Gender = 'male' | 'female';
export type StudentStatus = 'active' | 'inactive' | 'graduated';
export type TeacherStatus = 'active' | 'inactive';
export type ClassStatus = 'active' | 'archived';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'online';
export type MessageChannel = 'sms' | 'email' | 'in_app';
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface Student {
  id: string;
  userId?: string; // Links to User record
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  grade: string;
  enrolledClassIds: string[];
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
  notes?: string;
  medicalNotes?: string;
  avatar?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  userId?: string; // Links to User record
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  assignedClassIds: string[];
  avatar?: string;
  status: TeacherStatus;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSlot {
  day: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  room: string;
  schedule: ScheduleSlot[];
  maxCapacity: number;
  enrolledStudentIds: string[];
  color: string;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entries: AttendanceEntry[];
  markedBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  classId?: string;
  month?: string; // YYYY-MM format
  amount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  description: string;
  receiptNumber?: string;
  collectedByTeacher: boolean; // Whether teacher received their share from center manager
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId?: string;
  senderRole?: UserRole;
  recipientIds: string[]; // Student record IDs (legacy)
  recipientUserIds?: string[]; // User IDs for in-app messaging
  subject: string;
  body: string;
  channel: MessageChannel;
  status?: string;
  read?: boolean;
  sentAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistrationRequest {
  id: string;
  role: 'student' | 'teacher';
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // Optional for teachers
  gender?: Gender;      // Optional for teachers
  grade?: string;       // Optional for teachers
  parentName?: string;  // Optional for teachers
  parentPhone?: string; // Optional for teachers
  parentEmail?: string;
  address?: string;
  email?: string;          // For teachers
  password?: string;       // For teachers
  phone?: string;          // For teachers
  specialization?: string; // For teachers
  status: RegistrationStatus;
  approvedBy?: string; // User ID of admin/manager who approved
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  loginCode?: string; // Generated on approval for students
  studentId?: string; // Created Student record ID
  teacherId?: string; // Created Teacher record ID
  userId?: string; // Created User record ID
  createdAt: string;
  updatedAt: string;
}

export interface CenterSettings {
  centerName: string;
  centerNameAr: string;
  centerNameFr: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
}

// Dashboard stats
export interface DashboardStats {
  totalStudents: number;
  activeClasses: number;
  todaySessions: number;
  pendingPayments: number;
  attendanceRate: number;
  revenue: number;
  pendingRegistrations?: number;
}

 
export interface OtpCode {
  id: string;
  code: string;
  purpose: 'teacher_registration' | 'password_change';
  email: string;
  status: 'pending' | 'used' | 'expired';
  createdAt: string;
  updatedAt: string;
}
