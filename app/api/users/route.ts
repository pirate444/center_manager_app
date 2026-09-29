import UserModel from '@/models/User';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(UserModel);
export const GET = handler.GET;
export const POST = handler.POST;
