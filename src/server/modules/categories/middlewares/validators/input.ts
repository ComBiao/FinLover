import { AppError } from '@/server/shared/kernel/AppError';
import type { CategoryInput } from '@/server/shared/ports/categories';
/** Validate writable fields and normalize names before either create or update. */
export function validateCategoryInput(body: unknown, partial: boolean): CategoryInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('VALIDATION_ERROR', 'Body must be a JSON object', {});
  }
  const { name, type, color } = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const input: CategoryInput = {};
  if (!partial || name !== undefined) {
    if (typeof name !== 'string') fields.name = 'Name must be a string up to 50 characters';
    else if (name.trim().length === 0) fields.name = 'Name is required';
    else if (name.trim().length > 50) fields.name = 'Name must be a string up to 50 characters';
    else input.name = name.trim();
  }
  if (!partial || type !== undefined) {
    if (type !== 'income' && type !== 'expense') fields.type = 'Type must be income or expense';
    else input.type = type;
  }
  if (color !== undefined) {
    if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) fields.color = 'Color must be a six-digit hex color (#RRGGBB)';
    else input.color = color;
  }
  if (Object.keys(fields).length) {
    throw new AppError('VALIDATION_ERROR', 'Validation failed', fields);
  }
  return input;
}

