export class AppError extends Error {
  constructor(public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export const ERRORS = { VALIDATION_ERROR: 400, NOT_FOUND: 404, FORBIDDEN: 403, CONFLICT: 409, UNAUTHORIZED: 401, INTERNAL_ERROR: 500 } as const;
