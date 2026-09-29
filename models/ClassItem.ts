import mongoose, { Schema, Document } from 'mongoose';

const ScheduleSlotSchema = new Schema(
  {
    day: {
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

export interface IClassItem extends Document {
  name: string;
  subject: string;
  teacherId: string;
  room: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  maxCapacity: number;
  enrolledStudentIds: string[];
  color: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ClassItemSchema = new Schema<IClassItem>(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    teacherId: { type: String, required: true },
    room: { type: String, required: true },
    schedule: [ScheduleSlotSchema],
    maxCapacity: { type: Number, default: 20 },
    enrolledStudentIds: [{ type: String }],
    color: { type: String, default: '#06b6d4' },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.models.ClassItem || mongoose.model<IClassItem>('ClassItem', ClassItemSchema);
