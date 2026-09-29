import { NextRequest, NextResponse } from 'next/server';
import { getDownloadUrl } from '@/lib/b2';

// POST /api/resources/download — generate a presigned download URL
// Body: { key }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const downloadUrl = await getDownloadUrl(key);
    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
