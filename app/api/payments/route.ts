import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PaymentModel from '@/models/Payment';
import { createCollectionHandler, toPlain } from '@/lib/api-helpers';
import { notifyBillingRecord } from '@/lib/push-notifications';

const handler = createCollectionHandler(PaymentModel);
export const GET = handler.GET;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const doc = await PaymentModel.create(body);

    notifyBillingRecord(doc).catch((err) =>
      console.error('Push notification for payment failed:', err)
    );

    return NextResponse.json(toPlain(doc), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
