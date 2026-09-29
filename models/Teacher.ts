import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacher extends Document {
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  assignedClassIds: string[];
  avatar?: string;
  status: 'active' | 'inactive';
  hireDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    userId: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    specialization: { type: String, default: '' },
    assignedClassIds: [{ type: String }],
    avatar: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    hireDate: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);
