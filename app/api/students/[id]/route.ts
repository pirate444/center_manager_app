import StudentModel from '@/models/Student';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(StudentModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
