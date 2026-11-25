import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import QuizModel from '@/models/Quiz';
import QuizSubmissionModel from '@/models/QuizSubmission';
import { createItemHandler } from '@/lib/api-helpers';

const baseHandler = createItemHandler(QuizModel);
export const GET = baseHandler.GET;
export const PUT = baseHandler.PUT;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const doc = await QuizModel.findByIdAndDelete(id);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Also clean up any submissions for this quiz
    await QuizSubmissionModel.deleteMany({ quizId: id });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
