import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpCode extends Document {
  code: string;
  purpose: 'teacher_registration' | 'password_change';
  email: string; // The email of the teacher requesting it
  status: 'pending' | 'used' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

const OtpCodeSchema = new Schema<IOtpCode>(
  {
    code: { type: String, required: true },
    purpose: { type: String, enum: ['teacher_registration', 'password_change'], required: true },
    email: { type: String, required: true },
    status: { type: String, enum: ['pending', 'used', 'expired'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.models.OtpCode || mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema);
