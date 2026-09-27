import type { TransactionContext } from './unit-of-work';
export interface TransactionInput { walletId?: string; categoryId?: string | null; type: 'income' | 'expense'; amount: number; date: Date; note?: string }
export interface TransactionRecord extends TransactionInput { id: string; walletId: string; userId: string }
export interface TransactionRepositoryPort {
  findOwned(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
  create(userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord>;
  update(id: string, userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord | null>;
  remove(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
}
export interface WalletAccess { exists(id: string, userId: string, context: TransactionContext): Promise<boolean>; adjust(id: string, userId: string, delta: number, context: TransactionContext): Promise<void> }

export interface CategoryAccess { typeOf(id: string, userId: string, context: TransactionContext): Promise<string | null> }
