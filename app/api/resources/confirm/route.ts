import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ResourceSection from '@/models/ResourceSection';
import { toPlain } from '@/lib/api-helpers';
import { notifyNewResource } from '@/lib/push-notifications';

// POST /api/resources/confirm — confirm upload and add file metadata to section
// Body: { sectionId, key, fileName, fileSize, mimeType, uploadedBy }
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { sectionId, key, fileName, fileSize, mimeType, uploadedBy } = body;

    if (!sectionId || !key || !fileName || !mimeType || !uploadedBy) {
      return NextResponse.json(
        { error: 'sectionId, key, fileName, mimeType, and uploadedBy are required' },
        { status: 400 }
      );
    }

    const doc = await ResourceSection.findById(sectionId);
    if (!doc) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    doc.files.push({
      key,
      fileName,
      fileSize: fileSize || 0,
      mimeType,
      uploadedBy,
      uploadedAt: new Date(),
    });

    await doc.save();

    // Trigger push notification asynchronously to students in this class
    notifyNewResource({
      classId: doc.classId,
      fileName,
      uploadedBy,
    }).catch((err) => console.error('Push notification for resource failed:', err));

    return NextResponse.json(toPlain(doc));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
