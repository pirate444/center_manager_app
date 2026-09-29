import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistrationRequest extends Document {
  role: 'student' | 'teacher';
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  grade?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  address?: string;
  email?: string;
  password?: string;
  phone?: string;
  specialization?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  loginCode?: string;
  studentId?: string;
  teacherId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationRequestSchema = new Schema<IRegistrationRequest>(
  {
    role: { type: String, enum: ['student', 'teacher'], default: 'student' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: String },
    gender: { type: String, enum: ['male', 'female'] },
    grade: { type: String },
    parentName: { type: String },
    parentPhone: { type: String },
    parentEmail: { type: String },
    address: { type: String },
    email: { type: String },
    password: { type: String },
    phone: { type: String },
    specialization: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: String },
    approvedAt: { type: String },
    rejectedBy: { type: String },
    rejectedAt: { type: String },
    rejectionReason: { type: String },
    loginCode: { type: String },
    studentId: { type: String },
    teacherId: { type: String },
    userId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.RegistrationRequest ||
  mongoose.model<IRegistrationRequest>('RegistrationRequest', RegistrationRequestSchema);
