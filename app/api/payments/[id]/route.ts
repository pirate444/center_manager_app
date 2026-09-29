import PaymentModel from '@/models/Payment';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(PaymentModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
