import UserModel from '@/models/User';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(UserModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
