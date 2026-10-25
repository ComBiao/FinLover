import { describe, expect, it, vi } from 'vitest';
import { LookupUserService } from '../services/LookupUserService';
import type { UserRepositoryPort, UserRecord } from '@/server/shared/ports/users';
import { AppError } from '@/server/shared/kernel/AppError';

describe('LookupUserService', () => {
  const mockUsers: UserRepositoryPort = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    deleteById: vi.fn(),
    existsById: vi.fn(),
  };

  const service = new LookupUserService(mockUsers);

  it('rejects an invalid email format', async () => {
    await expect(service.execute('not-an-email', 'caller-1')).rejects.toThrow(AppError);
    await expect(service.execute('', 'caller-1')).rejects.toThrow(AppError);
    await expect(service.execute(undefined, 'caller-1')).rejects.toThrow(AppError);
  });

  it('throws VALIDATION_ERROR when user is not found', async () => {
    vi.mocked(mockUsers.findByEmail).mockResolvedValue(null);
    await expect(service.execute('unknown@example.com', 'caller-1')).rejects.toThrow(AppError);
  });

  it('throws VALIDATION_ERROR when caller tries to lookup themselves', async () => {
    const userDoc: UserRecord = {
      _id: { toString: () => 'caller-1' },
      email: 'self@example.com',
      name: 'Self',
      passwordHash: 'hash',
      dataPrivacyConsent: true,
      createdAt: new Date(),
    };
    vi.mocked(mockUsers.findByEmail).mockResolvedValue(userDoc);
    await expect(service.execute('self@example.com', 'caller-1')).rejects.toThrow(AppError);
  });

  it('returns public details (id, email, name) on successful lookup', async () => {
    const userDoc: UserRecord = {
      _id: { toString: () => 'user-2' },
      email: 'friend@example.com',
      name: 'Friend User',
      passwordHash: 'hash',
      dataPrivacyConsent: true,
      createdAt: new Date(),
    };
    vi.mocked(mockUsers.findByEmail).mockResolvedValue(userDoc);
    const result = await service.execute(' Friend@Example.Com ', 'caller-1');
    expect(result).toEqual({
      id: 'user-2',
      email: 'friend@example.com',
      name: 'Friend User',
    });
  });
});
