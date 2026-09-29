import ClassItemModel from '@/models/ClassItem';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(ClassItemModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
