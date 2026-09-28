import { apiErrorResponse, readJsonBody } from './errors';
export { HttpError as CategoryError } from './errors';
export function categoryErrorResponse(error: unknown) {
  return apiErrorResponse(error, {
    validationMessage: 'Validation failed',
    duplicate: { code: 'CONFLICT', message: 'A category with this name already exists' },
  });
}
export function readCategoryBody(request: Request) { return readJsonBody(request, 'Malformed JSON body'); }
