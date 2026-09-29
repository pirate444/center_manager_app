import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'center_manager' | 'teacher' | 'student';
  phone?: string;
  avatar?: string;
  loginCode?: string;
  studentId?: string;
  teacherId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, sparse: true },
    password: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: {
      type: String,
      enum: ['super_admin', 'center_manager', 'teacher', 'student'],
      required: true,
    },
    phone: { type: String },
    avatar: { type: String },
    loginCode: { type: String, sparse: true },
    studentId: { type: String },
    teacherId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
