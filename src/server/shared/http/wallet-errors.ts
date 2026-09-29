import { apiErrorResponse, readJsonBody } from './errors';
export { HttpError as WalletError } from './errors';
export function walletErrorResponse(error: unknown) {
  return apiErrorResponse(error, {
    validationMessage: 'Validation failed',
    duplicate: { code: 'CONFLICT', message: 'A wallet with this name already exists' },
  });
}
export function readWalletBody(request: Request) { return readJsonBody(request, 'Malformed JSON body'); }
