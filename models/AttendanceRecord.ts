import mongoose, { Schema, Document } from 'mongoose';

const AttendanceEntrySchema = new Schema(
  {
    studentId: { type: String, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true,
    },
    note: { type: String },
  },
  { _id: false }
);

export interface IAttendanceRecord extends Document {
  classId: string;
  date: string;
  entries: { studentId: string; status: string; note?: string }[];
  markedBy: string;
  createdAt: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    classId: { type: String, required: true },
    date: { type: String, required: true },
    entries: [AttendanceEntrySchema],
    markedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.AttendanceRecord ||
  mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
