import mongoose from 'mongoose';
import Category from '@/models/Category';
import { CategoryError } from '@/lib/categoryErrors';
import { deleteCategoryAndCascade } from './categoryService';

type CategoryInput = { name?: string; type?: 'income' | 'expense'; color?: string };

/** Validate writable fields and normalize names before either create or update. */
function validateCategoryInput(body: unknown, partial: boolean): CategoryInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new CategoryError(400, 'VALIDATION_ERROR', 'Body must be a JSON object', {});
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
    throw new CategoryError(400, 'VALIDATION_ERROR', 'Validation failed', fields);
  }
  return input;
}

/** Load only an owned, non-system category for mutation. */
async function getMutableCategory(id: string, userId: mongoose.Types.ObjectId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new CategoryError(400, 'VALIDATION_ERROR', 'Invalid category ID', {});
  }
  const category = await Category.findOne({ _id: id, userId });
  if (!category) throw new CategoryError(404, 'NOT_FOUND', 'Category not found');
  if (category.isSystem) throw new CategoryError(403, 'FORBIDDEN', 'System categories cannot be modified or deleted');
  return category;
}

/** Create a custom category for the authenticated user. */
export async function createCategory(userId: mongoose.Types.ObjectId, body: unknown) {
  return Category.create({ ...validateCategoryInput(body, false), userId, isSystem: false });
}

/** Apply validated partial changes to an owned custom category. */
export async function updateCategory(id: string, userId: mongoose.Types.ObjectId, body: unknown) {
  const category = await getMutableCategory(id, userId);
  Object.assign(category, validateCategoryInput(body, true));
  return category.save();
}

/** Enforce ownership and system protection before atomic deletion. */
export async function deleteCategory(id: string, userId: mongoose.Types.ObjectId) {
  await getMutableCategory(id, userId);
  return deleteCategoryAndCascade(id, userId);
}
