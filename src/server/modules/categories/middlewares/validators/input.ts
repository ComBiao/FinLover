import { AppError } from '@/server/shared/kernel/AppError';
import type { CategoryInput } from '@/server/shared/ports/categories';
import { categoryInput, categoryUpdate } from '@/shared/contracts';
import { validationFields } from '@/shared/contracts/validation';
export function validateCategoryInput(body: unknown, partial: boolean): CategoryInput {
  const result = (partial ? categoryUpdate : categoryInput).safeParse(body);
  if (!result.success) throw new AppError('VALIDATION_ERROR', 'Validation failed', validationFields(result.error));
  return result.data;
}
