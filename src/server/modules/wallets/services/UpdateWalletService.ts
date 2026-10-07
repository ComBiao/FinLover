import { AppError } from '@/server/shared/kernel/AppError';
import type { WalletRepositoryPort, WalletUpdateInput } from '@/server/shared/ports/wallets';
import { walletUpdate } from '@/shared/contracts';
import { validationFields } from '@/shared/contracts/validation';
import { mutable } from './mutable';

function validateInput(body: unknown): WalletUpdateInput {
  const result = walletUpdate.safeParse(body);
  if (!result.success) throw new AppError('VALIDATION_ERROR', 'Validation failed', validationFields(result.error));
  return result.data;
}

export class UpdateWalletService {
  constructor(private repo: WalletRepositoryPort) {}

  async execute(id: string, userId: string, body: unknown) {
    await mutable(this.repo, id, userId);
    const input = validateInput(body);

    if (input.name !== undefined) {
      const duplicate = (await this.repo.list(userId)).some(wallet => wallet.id !== id && wallet.name === input.name);
      if (duplicate) throw new AppError('CONFLICT', 'A wallet with this name already exists');
    }

    const updated = await this.repo.update(id, userId, input);
    if (!updated) throw new AppError('NOT_FOUND', 'Wallet not found');
    return updated;
  }
}
