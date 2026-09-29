import AttendanceRecordModel from '@/models/AttendanceRecord';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(AttendanceRecordModel);
export const GET = handler.GET;
export const POST = handler.POST;
