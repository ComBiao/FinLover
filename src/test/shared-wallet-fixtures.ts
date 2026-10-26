import type { WalletInvitation, WalletMember } from "@/features/wallets/shared/types";
import { mapWalletRecord } from "@/features/wallets/walletsService";
import type { Transaction } from "@/types/transaction";

/** A plain personal wallet. */
export const PERSONAL_WALLET = mapWalletRecord({
  id: "wallet-1",
  name: "Main Cash",
  balance: 5000,
  isDefault: true,
  color: "#4A4757",
  isSaving: false,
});

/** A shared wallet the signed-in user owns (3 members). */
export const OWNED_SHARED_WALLET = mapWalletRecord({
  id: "shared-1",
  name: "Housemate Fund",
  balance: 9391,
  isDefault: false,
  color: "#8B7CF6",
  icon: "Coins",
  isSaving: false,
  isShared: true,
  role: "owner",
  memberCount: 3,
  members: [
    { id: "u-me", name: "Tul" },
    { id: "u-guy", name: "Guy" },
    { id: "u-ice", name: "Ice" },
  ],
  ownerName: "Tul",
});

/** A shared wallet the signed-in user only contributes to (4 members, someone else owns it). */
export const JOINED_SHARED_WALLET = mapWalletRecord({
  id: "shared-2",
  name: "Japan Trip 2027",
  balance: 5500,
  isDefault: false,
  color: "#E85C7D",
  icon: "Plane",
  isSaving: false,
  isShared: true,
  role: "contributor",
  memberCount: 4,
  members: [
    { id: "u-bushi", name: "Bushi" },
    { id: "u-yeen", name: "Yeen" },
    { id: "u-me", name: "Tul" },
  ],
  ownerName: "Bushi",
});

/** Members of OWNED_SHARED_WALLET: the owner, two contributors and one pending invitation. */
export const OWNER_VIEW_MEMBERS: WalletMember[] = [
  { userId: "u-me", name: "Tul", email: "tul@example.com", role: "owner", status: "accepted", isYou: true },
  { userId: "u-guy", name: "Guy", email: "guy@example.com", role: "contributor", status: "accepted", isYou: false },
  { userId: "u-ice", name: "Ice", email: "ice@example.com", role: "contributor", status: "accepted", isYou: false },
  { userId: "u-yeen", name: "Yeen", email: "yeen@example.com", role: "contributor", status: "pending", isYou: false },
];

/** Members of JOINED_SHARED_WALLET. */
export const CONTRIBUTOR_VIEW_MEMBERS: WalletMember[] = [
  { userId: "u-bushi", name: "Bushi", email: "bushi@example.com", role: "owner", status: "accepted", isYou: false },
  { userId: "u-me", name: "Tul", email: "tul@example.com", role: "contributor", status: "accepted", isYou: true },
];

export const INVITATIONS: WalletInvitation[] = [
  { id: "invite-1", walletId: "wallet-x", walletName: "Office Lunch", invitedByName: "Yeen", createdAt: new Date().toISOString() },
  { id: "invite-2", walletId: "wallet-y", walletName: "Weekend Trip", invitedByName: "Bushi", createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
];

/** Two rows in OWNED_SHARED_WALLET: one logged by Guy and edited by the signed-in user, one logged by the user. */
export function sharedTransactions(year: number, month: number): Transaction[] {
  return [
    {
      id: "shared-tx-1",
      walletId: OWNED_SHARED_WALLET.id,
      type: "expense",
      amount: 599,
      date: new Date(year, month - 1, 15),
      title: "Internet",
      categoryKey: "utilities",
      createdBy: { id: "u-guy", name: "Guy", isYou: false },
      editedBy: { id: "u-me", name: "Tul", isYou: true },
    },
    {
      id: "shared-tx-2",
      walletId: OWNED_SHARED_WALLET.id,
      type: "income",
      amount: 6000,
      date: new Date(year, month - 1, 12),
      title: "Rent share",
      createdBy: { id: "u-me", name: "Tul", isYou: true },
    },
  ];
}
