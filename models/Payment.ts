import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  studentId: string;
  classId?: string;
  month?: string;
  amount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  method?: 'cash' | 'bank_transfer' | 'check' | 'online';
  description: string;
  receiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: String, required: true },
    classId: { type: String },
    month: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'DZD' },
    dueDate: { type: String, required: true },
    paidDate: { type: String },
    status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'partial'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'online'],
    },
    description: { type: String, default: '' },
    receiptNumber: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
