import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  userId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  grade: string;
  enrolledClassIds: string[];
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
  notes?: string;
  medicalNotes?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'graduated';
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    userId: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    grade: { type: String, required: true },
    enrolledClassIds: [{ type: String }],
    parentName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    parentEmail: { type: String },
    address: { type: String },
    notes: { type: String },
    medicalNotes: { type: String },
    avatar: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
