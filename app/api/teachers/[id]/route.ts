import TeacherModel from '@/models/Teacher';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(TeacherModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
