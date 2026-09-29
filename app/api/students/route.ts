import StudentModel from '@/models/Student';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(StudentModel);
export const GET = handler.GET;
export const POST = handler.POST;
