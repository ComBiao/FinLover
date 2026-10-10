import type { TransactionContext } from './unit-of-work';
import type { CategoryIcon } from '@/shared/contracts';
export type CategoryInput = { name?: string; type?: 'income' | 'expense'; color?: string; icon?: CategoryIcon };
export type SystemCategorySeed = {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: CategoryIcon;
};
export interface CategoryRecord { id: string; isSystem: boolean; type: 'income' | 'expense'; [key: string]: unknown }
export interface CategoryRepositoryPort {
  findOwned(id: string, userId: string, context?: TransactionContext): Promise<CategoryRecord | null>;
  list(userId: string, type?: 'income' | 'expense'): Promise<unknown[]>;
  create(userId: string, input: CategoryInput): Promise<unknown>;
  update(id: string, userId: string, input: CategoryInput): Promise<unknown>;
  delete(id: string, userId: string, context: TransactionContext): Promise<unknown>;
  createSystemDefaults(userId: string, categories: readonly SystemCategorySeed[], context: TransactionContext): Promise<void>;
}

export interface TransactionCategoryCleanup { clearCategory(id: string, userId: string, context: TransactionContext): Promise<void> }
