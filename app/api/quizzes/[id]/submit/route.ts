import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import QuizModel from '@/models/Quiz';
import QuizSubmissionModel from '@/models/QuizSubmission';
import { toPlain } from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { studentId, studentName, answers } = body;

    if (!studentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'studentId and answers array are required' }, { status: 400 });
    }

    const quiz = await QuizModel.findById(id);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.status === 'closed') {
      return NextResponse.json({ error: 'This quiz is closed' }, { status: 400 });
    }

    // Evaluate answers
    let score = 0;
    const evaluatedAnswers = quiz.questions.map((q: any, idx: number) => {
      const studentAns = answers.find((a: any) => a.questionIndex === idx);
      const selectedOptionIndex = studentAns ? studentAns.selectedOptionIndex : -1;
      const isCorrect = selectedOptionIndex === q.correctOptionIndex;
      if (isCorrect) {
        score += q.points || 1;
      }
      return {
        questionIndex: idx,
        selectedOptionIndex,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const totalPossiblePoints = quiz.questions.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || totalQuestions;
    const percentage = totalPossiblePoints > 0 ? Math.round((score / totalPossiblePoints) * 100) : 0;

    // Check if submission already exists for this student
    let submission = await QuizSubmissionModel.findOne({ quizId: id, studentId });
    if (submission) {
      submission.answers = evaluatedAnswers;
      submission.score = score;
      submission.totalQuestions = totalQuestions;
      submission.percentage = percentage;
      submission.submittedAt = new Date();
      if (studentName) submission.studentName = studentName;
      await submission.save();
    } else {
      submission = await QuizSubmissionModel.create({
        quizId: id,
        studentId,
        studentName: studentName || '',
        answers: evaluatedAnswers,
        score,
        totalQuestions,
        percentage,
        submittedAt: new Date(),
      });
    }

    return NextResponse.json({
      submission: toPlain(submission),
      quiz: toPlain(quiz),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
