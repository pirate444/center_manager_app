import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  points?: number;
}

export interface IQuiz extends Document {
  title: string;
  description?: string;
  classId: string;
  teacherId?: string;
  timeLimitMinutes?: number;
  questions: IQuizQuestion[];
  status: 'draft' | 'published' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
    points: { type: Number, default: 1 },
  },
  { _id: false }
);

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    classId: { type: String, required: true },
    teacherId: { type: String },
    timeLimitMinutes: { type: Number, default: 10 },
    questions: [QuizQuestionSchema],
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'published',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
