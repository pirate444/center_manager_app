import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ClassItemModel from '@/models/ClassItem';
import { createItemHandler, toPlain } from '@/lib/api-helpers';
import { notifyScheduleUpdate } from '@/lib/push-notifications';

const handler = createItemHandler(ClassItemModel);
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

    const oldDoc = await ClassItemModel.findById(id);
    if (!oldDoc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const doc = await ClassItemModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if schedule or room changed
    const scheduleChanged =
      body.schedule !== undefined &&
      JSON.stringify(oldDoc.schedule) !== JSON.stringify(doc.schedule);
    const roomChanged = body.room !== undefined && oldDoc.room !== doc.room;

    if (scheduleChanged || roomChanged) {
      const details = scheduleChanged
        ? `The class schedule for ${doc.name} has been updated.`
        : `The room for ${doc.name} has been changed to ${doc.room}.`;

      notifyScheduleUpdate({
        classId: id,
        details,
      }).catch((err) => console.error('Push notification for schedule update failed:', err));
    }

    return NextResponse.json(toPlain(doc));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
