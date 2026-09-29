import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId?: string;
  senderRole?: string;
  recipientIds: string[];
  recipientUserIds?: string[];
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'in_app';
  status?: string;
  read?: boolean;
  sentAt: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: String },
    senderRole: { type: String },
    recipientIds: [{ type: String }],
    recipientUserIds: [{ type: String }],
    subject: { type: String, required: true },
    body: { type: String, required: true },
    channel: {
      type: String,
      enum: ['sms', 'email', 'in_app'],
      default: 'in_app',
    },
    status: { type: String },
    read: { type: Boolean, default: false },
    sentAt: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
