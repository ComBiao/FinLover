import { AppError } from '@/server/shared/kernel/AppError';
import type { WalletCreateInput, WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { walletInput } from '@/shared/contracts';
import { validationFields } from '@/shared/contracts/validation';

export class CreateWalletService {
  constructor(private repo: WalletRepositoryPort) {}

  async execute(userId: string, body: unknown) {
    const result = walletInput.safeParse(body);
    if (!result.success) throw new AppError('VALIDATION_ERROR', 'Validation failed', validationFields(result.error));
    const input: WalletCreateInput = result.data;
    return this.repo.create(userId, input);
  }
}
