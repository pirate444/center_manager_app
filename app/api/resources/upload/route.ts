import { NextRequest, NextResponse } from 'next/server';
import { getUploadUrl, generateObjectKey } from '@/lib/b2';

// POST /api/resources/upload — generate a presigned upload URL
// Body: { classId, sectionId, fileName, mimeType }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, sectionId, fileName, mimeType } = body;

    if (!classId || !sectionId || !fileName || !mimeType) {
      return NextResponse.json(
        { error: 'classId, sectionId, fileName, and mimeType are required' },
        { status: 400 }
      );
    }

    // Validate file size limit (50MB) — enforced on client side, key generated here
    const key = generateObjectKey(classId, sectionId, fileName);
    const uploadUrl = await getUploadUrl(key, mimeType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
