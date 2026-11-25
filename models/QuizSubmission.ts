import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizAnswer {
  questionIndex: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export interface IQuizSubmission extends Document {
  quizId: string;
  studentId: string;
  studentName?: string;
  answers: IQuizAnswer[];
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: Date;
}

const QuizAnswerSchema = new Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedOptionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

const QuizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    quizId: { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, default: '' },
    answers: [QuizAnswerSchema],
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.QuizSubmission ||
  mongoose.model<IQuizSubmission>('QuizSubmission', QuizSubmissionSchema);
