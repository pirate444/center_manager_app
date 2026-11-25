import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import QuizModel from '@/models/Quiz';
import { toPlainArray, toPlain } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');
    const status = searchParams.get('status');

    const filter: Record<string, any> = {};
    if (classId) filter.classId = classId;
    if (teacherId) filter.teacherId = teacherId;
    if (status) filter.status = status;

    const docs = await QuizModel.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(toPlainArray(docs));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const doc = await QuizModel.create(body);
    return NextResponse.json(toPlain(doc), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
