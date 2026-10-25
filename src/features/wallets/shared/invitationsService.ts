import { getApi, postApi } from "@/lib/api/client";
import { sharedWalletMocksEnabled } from "@/features/wallets/shared/mockFlag";
import {
  mockAcceptInvitation,
  mockDeclineInvitation,
  mockListInvitations,
} from "@/features/wallets/shared/mock/sharedWalletMockStore";
import type { WalletInvitation } from "@/features/wallets/shared/types";

/**
 * Pending invitations addressed to the signed-in user, newest first.
 *
 * TODO(backend E7-02): `GET /api/v1/invitations`.
 */
export async function getInvitations(): Promise<WalletInvitation[]> {
  if (sharedWalletMocksEnabled()) return mockListInvitations();
  // The API wraps the list as { items, total }.
  return (await getApi<{ items: WalletInvitation[] }>("/api/v1/invitations")).items;
}

/**
 * Accepting joins the wallet as a Contributor; it then appears in the user's wallets.
 *
 * TODO(backend E7-02): `POST /api/v1/invitations/{id}/accept`.
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  if (sharedWalletMocksEnabled()) {
    await mockAcceptInvitation(invitationId);
    return;
  }
  await postApi<unknown>(`/api/v1/invitations/${invitationId}/accept`);
}

/**
 * Declining removes the invitation quietly; the Owner is not notified.
 *
 * TODO(backend E7-02): `POST /api/v1/invitations/{id}/decline`.
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  if (sharedWalletMocksEnabled()) return mockDeclineInvitation(invitationId);
  await postApi<unknown>(`/api/v1/invitations/${invitationId}/decline`);
}
