import { getApi, postApi } from "@/lib/api/client";
import type { WalletInvitation } from "@/features/wallets/shared/types";

/**
 * Pending invitations addressed to the signed-in user, newest first.
 */
export async function getInvitations(): Promise<WalletInvitation[]> {
  const res = await getApi<{ items: WalletInvitation[]; total: number }>("/api/v1/invitations");
  return res.items ?? [];
}

/**
 * Accepting joins the wallet as a Contributor; it then appears in the user's wallets.
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  await postApi<unknown>(`/api/v1/invitations/${invitationId}/accept`);
}

/**
 * Declining removes the invitation quietly; the Owner is not notified.
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  await postApi<unknown>(`/api/v1/invitations/${invitationId}/decline`);
}
