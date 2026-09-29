import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ResourceSection from '@/models/ResourceSection';
import { toPlain, toPlainArray } from '@/lib/api-helpers';

// GET /api/resources?classId=xxx — get all sections for a class
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 });
    }

    const docs = await ResourceSection.find({ classId }).sort({ createdAt: 1 });
    return NextResponse.json(toPlainArray(docs));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/resources — create a new section
// Body: { classId, name, createdBy }
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    const { classId, name, createdBy } = body;
    if (!classId || !name || !createdBy) {
      return NextResponse.json(
        { error: 'classId, name, and createdBy are required' },
        { status: 400 }
      );
    }

    // Check for duplicate section name within the same class
    const existing = await ResourceSection.findOne({ classId, name });
    if (existing) {
      return NextResponse.json(
        { error: 'A section with this name already exists for this class' },
        { status: 409 }
      );
    }

    const doc = await ResourceSection.create({ classId, name, createdBy, files: [] });
    return NextResponse.json(toPlain(doc), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
