import MessageModel from '@/models/Message';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(MessageModel);
export const GET = handler.GET;
export const POST = handler.POST;
