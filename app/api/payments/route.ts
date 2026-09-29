import PaymentModel from '@/models/Payment';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(PaymentModel);
export const GET = handler.GET;
export const POST = handler.POST;
