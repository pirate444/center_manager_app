import ClassItemModel from '@/models/ClassItem';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(ClassItemModel);
export const GET = handler.GET;
export const POST = handler.POST;
