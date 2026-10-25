import { deleteApi, getApi, postApi } from "@/lib/api/client";
import { isMockTarget, sharedWalletMocksEnabled } from "@/features/wallets/shared/mockFlag";
import {
  mockInviteMember,
  mockLeaveWallet,
  mockListMembers,
  mockRemoveMember,
  mockTransferOwnership,
  mockValidateInviteEmail,
} from "@/features/wallets/shared/mock/sharedWalletMockStore";
import type { WalletMember } from "@/features/wallets/shared/types";

/**
 * Look up a registered user by email to validate adding them to an invite list.
 * Rejects with `ApiClientError` (400 "User not found" or "Cannot invite yourself").
 */
export async function validateInviteEmail(email: string): Promise<{ id: string; email: string; name: string }> {
  if (sharedWalletMocksEnabled()) return mockValidateInviteEmail(email);
  return getApi<{ id: string; email: string; name: string }>(`/api/v1/users/lookup?email=${encodeURIComponent(email)}`);
}

/**
 * Members of one shared wallet: accepted members first (owner on top), then
 * pending invitations. Any accepted member may read it.
 *
 * TODO(backend E7-07): `GET /api/v1/wallets/{id}/members`.
 */
export async function getMembers(walletId: string, currentUserId?: string): Promise<WalletMember[]> {
  if (isMockTarget(walletId)) return mockListMembers(walletId);
  const res = await getApi<{ members: (Omit<WalletMember, 'isYou'> & { isYou?: boolean })[] }>(`/api/v1/wallets/${walletId}/members`);
  const members = res.members ?? [];
  return members.map(m => ({
    ...m,
    isYou: Boolean(m.isYou || (currentUserId ? m.userId === currentUserId : false)),
  }));
}

/**
 * Owner-only: invite a registered user by email as a Contributor.
 * Rejects with `ApiClientError` — 400 `fields.email` "User not found" /
 * "Cannot invite yourself", 409 when already a member or invited, 403 for a non-owner.
 *
 * TODO(backend E7-02): `POST /api/v1/wallets/{id}/invitations` body `{ email }`.
 */
export async function inviteMember(walletId: string, email: string): Promise<WalletMember> {
  if (isMockTarget(walletId)) return mockInviteMember(walletId, email);
  return postApi<WalletMember>(`/api/v1/wallets/${walletId}/invitations`, { email });
}

/**
 * Owner-only: remove an accepted member, or cancel a pending invitation
 * (their past transactions stay in the wallet).
 *
 * TODO(backend E7-07): `DELETE /api/v1/wallets/{id}/members/{userId}`.
 */
export async function removeMember(walletId: string, userId: string): Promise<void> {
  if (isMockTarget(walletId)) return mockRemoveMember(walletId, userId);
  return deleteApi(`/api/v1/wallets/${walletId}/members/${userId}`);
}

/**
 * A Contributor leaves at any time (their transactions stay). The Owner gets
 * 409 while other members remain and must transfer ownership first.
 *
 * TODO(backend E7-07): `POST /api/v1/wallets/{id}/leave`.
 */
export async function leaveWallet(walletId: string): Promise<void> {
  if (isMockTarget(walletId)) return mockLeaveWallet(walletId);
  await postApi<null>(`/api/v1/wallets/${walletId}/leave`);
}

/**
 * Owner-only: hand ownership to an accepted Contributor (the caller becomes a Contributor).
 *
 * TODO(backend E7-07): `POST /api/v1/wallets/{id}/transfer-ownership` body `{ userId }`.
 */
export async function transferOwnership(walletId: string, userId: string): Promise<void> {
  if (isMockTarget(walletId)) return mockTransferOwnership(walletId, userId);
  await postApi<null>(`/api/v1/wallets/${walletId}/transfer-ownership`, { userId });
}
