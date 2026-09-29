import RegistrationRequestModel from '@/models/RegistrationRequest';
import { createCollectionHandler } from '@/lib/api-helpers';

const handler = createCollectionHandler(RegistrationRequestModel);
export const GET = handler.GET;
export const POST = handler.POST;
