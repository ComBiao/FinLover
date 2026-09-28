import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { AppError, ERRORS } from '@/server/shared/kernel/AppError';
import { logError } from './logging';
export { validationFields } from '@/shared/contracts/validation';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}
type ErrorOptions = {
  validationStatus?: number;
  validationMessage?: string;
  duplicate?: { code: string; message: string; fields?: Record<string, string> };
};
/** One mapper; only documented legacy validation status/messages vary by route. */
export function apiErrorResponse(error: unknown, options: ErrorOptions = {}) {
  const validationStatus = options.validationStatus ?? 400;
  if (error instanceof HttpError) return errorResponse(error.status, error.code, error.message, error.fields);
  if (error instanceof AppError) {
    const status = error.code === 'VALIDATION_ERROR' ? validationStatus : ERRORS[error.code as keyof typeof ERRORS];
    if (status && status < 500) return errorResponse(status, error.code, error.message, error.fields);
  }
  if (options.duplicate && typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    return errorResponse(409, options.duplicate.code, options.duplicate.message, options.duplicate.fields);
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message]));
    return errorResponse(validationStatus, 'VALIDATION_ERROR', options.validationMessage ?? 'One or more fields are invalid', fields);
  }
  logError(error);
  return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
}
export async function readJsonBody(request: Request, message = 'Request body must be valid JSON'): Promise<unknown> {
  try { return await request.json(); }
  catch { throw new HttpError(400, 'INVALID_JSON', message); }
}
