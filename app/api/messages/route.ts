import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MessageModel from '@/models/Message';
import { createCollectionHandler, toPlain } from '@/lib/api-helpers';
import { notifyNewMessage } from '@/lib/push-notifications';

const handler = createCollectionHandler(MessageModel);
export const GET = handler.GET;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const doc = await MessageModel.create(body);

    // Asynchronously dispatch push notification to recipients
    notifyNewMessage(doc).catch((err) => console.error('Push notification failed:', err));

    return NextResponse.json(toPlain(doc), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
