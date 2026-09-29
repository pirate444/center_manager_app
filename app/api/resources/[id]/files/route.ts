import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ResourceSection from '@/models/ResourceSection';
import { toPlain } from '@/lib/api-helpers';
import { deleteObject } from '@/lib/b2';

// DELETE /api/resources/[id]/files?fileId=xxx — remove a single file from a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const doc = await ResourceSection.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const file = doc.files.id(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from B2
    try {
      await deleteObject(file.key);
    } catch (err) {
      console.error(`Failed to delete ${file.key} from B2:`, err);
    }

    // Remove from the document
    doc.files.pull({ _id: fileId });
    await doc.save();

    return NextResponse.json(toPlain(doc));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
