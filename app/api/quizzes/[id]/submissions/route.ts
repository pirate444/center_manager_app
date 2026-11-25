import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import QuizSubmissionModel from '@/models/QuizSubmission';
import { toPlainArray } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    const filter: Record<string, any> = { quizId: id };
    if (studentId) filter.studentId = studentId;

    const submissions = await QuizSubmissionModel.find(filter).sort({ submittedAt: -1 });
    return NextResponse.json(toPlainArray(submissions));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
