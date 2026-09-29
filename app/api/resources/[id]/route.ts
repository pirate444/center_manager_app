import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ResourceSection from '@/models/ResourceSection';
import { toPlain } from '@/lib/api-helpers';
import { deleteObject } from '@/lib/b2';

// GET /api/resources/[id] — get a single section
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const doc = await ResourceSection.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(toPlain(doc));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/resources/[id] — update section (rename)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const doc = await ResourceSection.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(toPlain(doc));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/resources/[id] — delete section and all its files from B2
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const doc = await ResourceSection.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete all files from B2
    const deletePromises = doc.files.map((file: any) =>
      deleteObject(file.key).catch((err: any) =>
        console.error(`Failed to delete ${file.key} from B2:`, err)
      )
    );
    await Promise.allSettled(deletePromises);

    await ResourceSection.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
