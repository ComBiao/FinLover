import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { walletSavingUpdate } from '@/shared/contracts';
import { validationFields } from '@/shared/contracts/validation';
import { AppError } from '@/server/shared/kernel/AppError';
import { mutable } from './mutable';
export class UpdateWalletSavingService {
  constructor(private repo: WalletRepositoryPort) {}
  async execute(id: string, userId: string, body: unknown) {
    const parsed = walletSavingUpdate.safeParse(body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Validation failed', validationFields(parsed.error));
    await mutable(this.repo, id, userId);
    const wallet = await this.repo.setSaving(id, userId, parsed.data);
    if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
    return wallet;
  }
}
