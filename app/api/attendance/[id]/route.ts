import AttendanceRecordModel from '@/models/AttendanceRecord';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(AttendanceRecordModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
