import TeacherModel from '@/models/Teacher';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(TeacherModel);
export const GET = handler.GET;
export const POST = handler.POST;
