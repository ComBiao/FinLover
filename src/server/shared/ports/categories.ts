import type { TransactionContext } from './unit-of-work';
export type CategoryInput = { name?: string; type?: 'income' | 'expense'; color?: string };
export interface CategoryRecord { id: string; isSystem: boolean; type: 'income' | 'expense'; [key: string]: unknown }
export interface CategoryRepositoryPort {
  findOwned(id: string, userId: string, context?: TransactionContext): Promise<CategoryRecord | null>;
  create(userId: string, input: CategoryInput): Promise<unknown>;
  update(id: string, userId: string, input: CategoryInput): Promise<unknown>;
  delete(id: string, userId: string, context: TransactionContext): Promise<unknown>;
}

export interface TransactionCategoryCleanup { clearCategory(id: string, userId: string, context: TransactionContext): Promise<void> }
