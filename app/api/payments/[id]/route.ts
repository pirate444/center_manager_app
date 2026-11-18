import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PaymentModel from '@/models/Payment';
import { createItemHandler, toPlain } from '@/lib/api-helpers';
import { notifyBillingRecord } from '@/lib/push-notifications';

const handler = createItemHandler(PaymentModel);
export const GET = handler.GET;
export const DELETE = handler.DELETE;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const oldDoc = await PaymentModel.findById(id);
    if (!oldDoc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const doc = await PaymentModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Trigger notification if payment status changed or payment was updated
    if (body.status !== undefined && oldDoc.status !== doc.status) {
      notifyBillingRecord(doc).catch((err) =>
        console.error('Push notification for payment update failed:', err)
      );
    }

    return NextResponse.json(toPlain(doc));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
