import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import QuizSubmissionModel from '@/models/QuizSubmission';
import { toPlainArray } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const quizId = searchParams.get('quizId');

    const filter: Record<string, any> = {};
    if (studentId) filter.studentId = studentId;
    if (quizId) filter.quizId = quizId;

    const submissions = await QuizSubmissionModel.find(filter).sort({ submittedAt: -1 });
    return NextResponse.json(toPlainArray(submissions));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
