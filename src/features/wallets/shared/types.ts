/**
 * Client-side DRAFT of the Epic 7 (shared wallet) API shapes.
 *
 * TODO(backend E7-01a): these mirror what the UI needs. The backend owns the
 * real contract in `src/shared/contracts`; when it lands, replace/align these
 * types with it (the `TODO(backend` comments in the services list the endpoints).
 */

export type WalletRole = "owner" | "contributor";

export type MemberStatus = "accepted" | "pending";

/** Small member entry used for the avatar stack on a wallet card. */
export type WalletMemberPreview = {
  id: string;
  name: string;
};

/** Extra fields a wallet record carries when `isShared` is true. */
export type SharedWalletFields = {
  isShared?: boolean;
  role?: WalletRole;
  /** Accepted members, owner included. */
  memberCount?: number;
  /** First few accepted members (owner included) for the avatar stack. */
  members?: WalletMemberPreview[];
  ownerName?: string;
};

/** One row of the Members dialog: an accepted member or a pending invitation. */
export type WalletMember = {
  userId: string;
  name: string;
  email: string;
  role: WalletRole;
  status: MemberStatus;
  /** True for the signed-in user, so the UI can append "(you)". */
  isYou: boolean;
};

/** A pending invitation addressed to the signed-in user. */
export type WalletInvitation = {
  id: string;
  walletId: string;
  walletName: string;
  invitedByName: string;
  createdAt: string;
};

/** Who logged / last edited a transaction in a shared wallet. */
export type TransactionAuthor = {
  id: string;
  /** "Deleted user" once the author's account is gone. */
  name: string;
  isYou: boolean;
};
