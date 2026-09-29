import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  centerName: string;
  centerNameAr: string;
  centerNameFr: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    centerName: { type: String, default: 'Education Center' },
    centerNameAr: { type: String, default: '' },
    centerNameFr: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logo: { type: String },
    workingDays: [{ type: String }],
    startTime: { type: String, default: '08:00' },
    endTime: { type: String, default: '18:00' },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
