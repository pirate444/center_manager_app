import MessageModel from '@/models/Message';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(MessageModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
