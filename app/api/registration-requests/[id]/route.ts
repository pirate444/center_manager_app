import RegistrationRequestModel from '@/models/RegistrationRequest';
import { createItemHandler } from '@/lib/api-helpers';

const handler = createItemHandler(RegistrationRequestModel);
export const GET = handler.GET;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
