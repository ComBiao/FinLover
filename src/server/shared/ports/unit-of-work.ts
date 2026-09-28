export interface TransactionContext { readonly session: unknown }
export interface UnitOfWork { run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> }
