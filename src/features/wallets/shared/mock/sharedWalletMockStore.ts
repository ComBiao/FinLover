/**
 * In-memory stand-in for the Epic 7 backend (TEMPORARY).
 *
 * Only the service seams import this file (walletsService, transactionsService,
 * homeService, membersService, invitationsService). Components never know it
 * exists. Delete this folder when the backend endpoints are live — see the
 * header of `../mockFlag.ts`.
 *
 * State lives in module memory, so it resets on a full page reload.
 */
import { ApiClientError, getApi } from "@/lib/api/client";
import type { MonthKey } from "@/features/homepage/month";
import type { HomeSummary } from "@/features/homepage/services/homeService";
import type {
  SharedWalletFields,
  TransactionAuthor,
  WalletInvitation,
  WalletMember,
  WalletMemberPreview,
  WalletRole,
} from "@/features/wallets/shared/types";
import type { TransactionType } from "@/types/category";

type MockUser = { id: string; name: string; email: string };

type MockMember = { userId: string; role: WalletRole; status: "accepted" | "pending"; invitedByName?: string; invitedAt?: string };

type MockWallet = {
  id: string;
  name: string;
  color: string;
  icon: string;
  isSaving: boolean;
  goalAmount?: number;
  createdAt: string;
  members: MockMember[];
};

type MockTransaction = {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  note?: string;
  createdBy: string;
  editedBy?: string;
};

/** Wallet record shape the real `GET /api/v1/wallets` would return for a shared wallet. */
export type MockWalletRecord = SharedWalletFields & {
  id: string;
  name: string;
  balance: number;
  isDefault: false;
  color: string;
  icon: string;
  isSaving: boolean;
  goalAmount?: number;
  createdAt: string;
  updatedAt: string;
};

/** Transaction record shape of `GET/POST/PUT .../transactions` for a shared wallet. */
export type MockTransactionRecord = {
  id: string;
  walletId: string;
  categoryId: null;
  type: TransactionType;
  amount: number;
  date: string;
  title: string;
  note?: string;
  createdBy: TransactionAuthor;
  editedBy?: TransactionAuthor;
};

export const MOCK_ME_ID = "mock-user-me";
const DELETED_USER_NAME = "Deleted user";

type MockState = {
  me: MockUser;
  meLoaded: boolean;
  users: Record<string, MockUser>;
  wallets: MockWallet[];
  transactions: MockTransaction[];
  counter: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** A date in the current month (day capped at 28) as YYYY-MM-DD, so seeded rows always show on Home's default month. */
function dayOfThisMonth(day: number) {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(Math.min(day, 28))}`;
}

function seed(): MockState {
  const users: Record<string, MockUser> = {
    [MOCK_ME_ID]: { id: MOCK_ME_ID, name: "You", email: "you@example.com" },
    "mock-user-guy": { id: "mock-user-guy", name: "Guy", email: "guy@example.com" },
    "mock-user-ice": { id: "mock-user-ice", name: "Ice", email: "ice@example.com" },
    "mock-user-yeen": { id: "mock-user-yeen", name: "Yeen", email: "yeen@example.com" },
    "mock-user-bushi": { id: "mock-user-bushi", name: "Bushi", email: "bushi@example.com" },
    "mock-user-nook": { id: "mock-user-nook", name: "Nook", email: "nook@example.com" },
    "mock-user-boss": { id: "mock-user-boss", name: "Boss", email: "boss@example.com" },
  };

  const wallets: MockWallet[] = [
    {
      id: "mock-wallet-housemate",
      name: "Housemate Fund",
      color: "#8B7CF6",
      icon: "Coins",
      isSaving: false,
      createdAt: new Date().toISOString(),
      members: [
        { userId: MOCK_ME_ID, role: "owner", status: "accepted" },
        { userId: "mock-user-guy", role: "contributor", status: "accepted" },
        { userId: "mock-user-ice", role: "contributor", status: "accepted" },
        { userId: "mock-user-yeen", role: "contributor", status: "pending", invitedByName: "You" },
      ],
    },
    {
      id: "mock-wallet-japan",
      name: "Japan Trip 2027",
      color: "#E85C7D",
      icon: "Plane",
      isSaving: true,
      goalAmount: 60000,
      createdAt: new Date().toISOString(),
      members: [
        { userId: "mock-user-bushi", role: "owner", status: "accepted" },
        { userId: "mock-user-yeen", role: "contributor", status: "accepted" },
        { userId: MOCK_ME_ID, role: "contributor", status: "accepted" },
        { userId: "mock-user-nook", role: "contributor", status: "accepted" },
      ],
    },
    // Wallets the signed-in user has only been invited to (they show up as invitations).
    {
      id: "mock-wallet-office",
      name: "Office Lunch",
      color: "#F59E0B",
      icon: "ShoppingBag",
      isSaving: false,
      createdAt: new Date().toISOString(),
      members: [
        { userId: "mock-user-yeen", role: "owner", status: "accepted" },
        { userId: MOCK_ME_ID, role: "contributor", status: "pending", invitedByName: "Yeen", invitedAt: new Date().toISOString() },
      ],
    },
    {
      id: "mock-wallet-weekend",
      name: "Weekend Trip",
      color: "#3B82F6",
      icon: "Plane",
      isSaving: false,
      createdAt: new Date().toISOString(),
      members: [
        { userId: "mock-user-bushi", role: "owner", status: "accepted" },
        { userId: MOCK_ME_ID, role: "contributor", status: "pending", invitedByName: "Bushi", invitedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
      ],
    },
  ];

  const tx = (
    id: number,
    walletId: string,
    type: TransactionType,
    amount: number,
    day: number,
    title: string,
    createdBy: string,
    editedBy?: string
  ): MockTransaction => ({ id: `mock-tx-${id}`, walletId, type, amount, date: dayOfThisMonth(day), title, createdBy, editedBy });

  const transactions: MockTransaction[] = [
    tx(1, "mock-wallet-housemate", "expense", 350, 21, "Groceries", "mock-user-guy"),
    tx(2, "mock-wallet-housemate", "expense", 1420, 20, "Electricity bill", MOCK_ME_ID, "mock-user-guy"),
    tx(3, "mock-wallet-housemate", "income", 6000, 18, "Rent share", "mock-user-ice"),
    tx(4, "mock-wallet-housemate", "expense", 599, 15, "Internet", "mock-user-guy", MOCK_ME_ID),
    tx(5, "mock-wallet-housemate", "income", 6000, 12, "Rent share", MOCK_ME_ID),
    tx(6, "mock-wallet-housemate", "expense", 240, 10, "Cleaning supplies", "mock-user-ice"),
    tx(7, "mock-wallet-japan", "income", 8000, 5, "Flight fund", "mock-user-bushi"),
    tx(8, "mock-wallet-japan", "expense", 2500, 8, "Hotel deposit", "mock-user-yeen"),
  ];

  return { me: users[MOCK_ME_ID], meLoaded: false, users, wallets, transactions, counter: 100 };
}

let state: MockState = seed();

/** Test helper: back to the seed (optionally pretending /auth/me already answered with `meName`). */
export function resetMockStore(options: { meName?: string } = {}) {
  state = seed();
  if (options.meName) {
    state.users[MOCK_ME_ID].name = options.meName;
    state.meLoaded = true;
  }
}

/** Uses the real signed-in user's name for "(you)" rows; best effort, never throws. */
async function ensureMe() {
  if (state.meLoaded) return;
  state.meLoaded = true;
  try {
    const { user } = await getApi<{ user: { id: string; email: string; name?: string } }>("/api/v1/auth/me");
    const me = state.users[MOCK_ME_ID];
    me.name = user.name?.trim() || user.email.split("@")[0];
    me.email = user.email;
  } catch {
    /* keep the placeholder identity */
  }
}

function nextId(prefix: string) {
  state.counter += 1;
  return `mock-${prefix}-${state.counter}`;
}

function userName(userId: string) {
  return state.users[userId]?.name ?? DELETED_USER_NAME;
}

function author(userId: string): TransactionAuthor {
  return { id: userId, name: userName(userId), isYou: userId === MOCK_ME_ID };
}

function findWallet(walletId: string): MockWallet {
  const wallet = state.wallets.find((candidate) => candidate.id === walletId);
  if (!wallet) throw new ApiClientError("Wallet not found", 404);
  return wallet;
}

function myMembership(wallet: MockWallet) {
  return wallet.members.find((member) => member.userId === MOCK_ME_ID);
}

function requireMember(walletId: string): MockWallet {
  const wallet = findWallet(walletId);
  if (myMembership(wallet)?.status !== "accepted") {
    throw new ApiClientError("You are not a member of this wallet", 403);
  }
  return wallet;
}

function requireOwner(walletId: string, message = "Only the owner can do this"): MockWallet {
  const wallet = requireMember(walletId);
  if (myMembership(wallet)?.role !== "owner") throw new ApiClientError(message, 403);
  return wallet;
}

function acceptedMembers(wallet: MockWallet) {
  return wallet.members.filter((member) => member.status === "accepted");
}

function walletBalance(walletId: string) {
  return state.transactions
    .filter((transaction) => transaction.walletId === walletId)
    .reduce((sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0);
}

function toWalletRecord(wallet: MockWallet): MockWalletRecord {
  const accepted = acceptedMembers(wallet);
  const owner = accepted.find((member) => member.role === "owner");
  const previews: WalletMemberPreview[] = accepted.slice(0, 3).map((member) => ({ id: member.userId, name: userName(member.userId) }));
  return {
    id: wallet.id,
    name: wallet.name,
    balance: walletBalance(wallet.id),
    isDefault: false,
    color: wallet.color,
    icon: wallet.icon,
    isSaving: wallet.isSaving,
    goalAmount: wallet.goalAmount,
    createdAt: wallet.createdAt,
    updatedAt: wallet.createdAt,
    isShared: true,
    role: myMembership(wallet)?.role ?? "contributor",
    memberCount: accepted.length,
    members: previews,
    ownerName: owner ? userName(owner.userId) : DELETED_USER_NAME,
  };
}

function toTransactionRecord(transaction: MockTransaction): MockTransactionRecord {
  return {
    id: transaction.id,
    walletId: transaction.walletId,
    categoryId: null,
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.date,
    title: transaction.title,
    note: transaction.note,
    createdBy: author(transaction.createdBy),
    editedBy: transaction.editedBy ? author(transaction.editedBy) : undefined,
  };
}

/* ------------------------------ wallets ------------------------------ */

/** TODO(backend E7-01b): replaced by the shared wallets in `GET /api/v1/wallets`. */
export async function mockListWallets(): Promise<MockWalletRecord[]> {
  await ensureMe();
  return state.wallets
    .filter((wallet) => myMembership(wallet)?.status === "accepted")
    .map(toWalletRecord);
}

/** TODO(backend E7-02): replaced by `POST /api/v1/wallets` with `isShared: true`. */
export async function mockCreateWallet(input: {
  name: string;
  color?: string;
  icon?: string;
  isSaving?: boolean;
  goalAmount?: number;
}): Promise<MockWalletRecord> {
  await ensureMe();
  const wallet: MockWallet = {
    id: nextId("wallet"),
    name: input.name,
    color: input.color ?? "#8B7CF6",
    icon: input.icon ?? "Wallet",
    isSaving: Boolean(input.isSaving),
    goalAmount: input.isSaving ? input.goalAmount : undefined,
    createdAt: new Date().toISOString(),
    members: [{ userId: MOCK_ME_ID, role: "owner", status: "accepted" }],
  };
  state.wallets.push(wallet);
  return toWalletRecord(wallet);
}

/** TODO(backend E7-01b): replaced by `PUT /api/v1/wallets/{id}` (owner only). */
export async function mockUpdateWallet(
  walletId: string,
  input: { name?: string; color?: string; icon?: string }
): Promise<MockWalletRecord> {
  await ensureMe();
  const wallet = requireOwner(walletId, "Only the owner can edit this wallet");
  if (input.name !== undefined) wallet.name = input.name;
  if (input.color !== undefined) wallet.color = input.color;
  if (input.icon !== undefined) wallet.icon = input.icon;
  return toWalletRecord(wallet);
}

/** TODO(backend E7-01b): replaced by `PATCH /api/v1/wallets/{id}/saving` (owner only). */
export async function mockSetSaving(
  walletId: string,
  input: { isSaving: boolean; goalAmount?: number }
): Promise<MockWalletRecord> {
  await ensureMe();
  const wallet = requireOwner(walletId, "Only the owner can change the saving goal");
  wallet.isSaving = input.isSaving;
  wallet.goalAmount = input.isSaving ? input.goalAmount : undefined;
  return toWalletRecord(wallet);
}

/** TODO(backend E7-09-API): replaced by `DELETE /api/v1/wallets/{id}` (owner only, 403 for a contributor). */
export async function mockDeleteWallet(walletId: string): Promise<void> {
  await ensureMe();
  const wallet = requireOwner(walletId, "Only the owner can delete this wallet");
  state.wallets = state.wallets.filter((candidate) => candidate.id !== wallet.id);
  state.transactions = state.transactions.filter((transaction) => transaction.walletId !== wallet.id);
}

/* ------------------------------ members ------------------------------ */

function toMemberRow(member: MockMember): WalletMember {
  const user = state.users[member.userId];
  return {
    userId: member.userId,
    name: user?.name ?? DELETED_USER_NAME,
    email: user?.email ?? "",
    role: member.role,
    status: member.status,
    isYou: member.userId === MOCK_ME_ID,
  };
}

/** TODO(backend E7-07): replaced by `GET /api/v1/wallets/{id}/members`. */
export async function mockListMembers(walletId: string): Promise<WalletMember[]> {
  await ensureMe();
  const wallet = requireMember(walletId);
  const rank = (member: MockMember) => (member.status === "pending" ? 2 : member.role === "owner" ? 0 : 1);
  return [...wallet.members].sort((a, b) => rank(a) - rank(b)).map(toMemberRow);
}

/** TODO(backend E7-02): replaced by `POST /api/v1/wallets/{id}/invitations` (owner only). */
export async function mockInviteMember(walletId: string, rawEmail: string): Promise<WalletMember> {
  await ensureMe();
  const wallet = requireOwner(walletId, "Only the owner can invite members");
  const email = rawEmail.trim().toLowerCase();
  if (email === state.users[MOCK_ME_ID].email.toLowerCase()) {
    throw new ApiClientError("Cannot invite yourself", 400, { email: "Cannot invite yourself" });
  }
  const user = Object.values(state.users).find((candidate) => candidate.email.toLowerCase() === email);
  if (!user) throw new ApiClientError("User not found", 400, { email: "User not found" });
  if (wallet.members.some((member) => member.userId === user.id)) {
    throw new ApiClientError("Already a member or invited", 409, { email: "Already a member or invited" });
  }
  const member: MockMember = { userId: user.id, role: "contributor", status: "pending", invitedByName: userName(MOCK_ME_ID), invitedAt: new Date().toISOString() };
  wallet.members.push(member);
  return toMemberRow(member);
}

/** TODO(backend E7-07): replaced by `DELETE /api/v1/wallets/{id}/members/{userId}` (owner only; also cancels a pending invite). */
export async function mockRemoveMember(walletId: string, userId: string): Promise<void> {
  await ensureMe();
  const wallet = requireOwner(walletId, "Only the owner can remove members");
  const target = wallet.members.find((member) => member.userId === userId);
  if (!target) throw new ApiClientError("Member not found", 404);
  if (target.role === "owner") throw new ApiClientError("The owner can't be removed", 400);
  wallet.members = wallet.members.filter((member) => member !== target);
}

/** TODO(backend E7-07): replaced by `POST /api/v1/wallets/{id}/leave`. */
export async function mockLeaveWallet(walletId: string): Promise<void> {
  await ensureMe();
  const wallet = requireMember(walletId);
  const mine = myMembership(wallet)!;
  if (mine.role === "owner") {
    if (acceptedMembers(wallet).length > 1) {
      throw new ApiClientError("Transfer ownership to another member before you leave", 409);
    }
    // Last member: leaving disbands the wallet.
    await mockDeleteWallet(walletId);
    return;
  }
  wallet.members = wallet.members.filter((member) => member !== mine);
}

/** TODO(backend E7-07): replaced by `POST /api/v1/wallets/{id}/transfer-ownership` (owner only). */
export async function mockTransferOwnership(walletId: string, userId: string): Promise<void> {
  await ensureMe();
  const wallet = requireOwner(walletId, "Only the owner can transfer ownership");
  const target = wallet.members.find((member) => member.userId === userId);
  if (!target || target.status !== "accepted" || target.role !== "contributor") {
    throw new ApiClientError("Ownership can only go to an active contributor", 400);
  }
  target.role = "owner";
  myMembership(wallet)!.role = "contributor";
}

/* ---------------------------- invitations ---------------------------- */

function toInvitation(wallet: MockWallet, member: MockMember): WalletInvitation {
  return {
    id: `mock-invite-${wallet.id}`,
    walletId: wallet.id,
    walletName: wallet.name,
    invitedByName: member.invitedByName ?? DELETED_USER_NAME,
    createdAt: member.invitedAt ?? wallet.createdAt,
  };
}

/** TODO(backend E7-02): replaced by `GET /api/v1/invitations`. */
export async function mockListInvitations(): Promise<WalletInvitation[]> {
  await ensureMe();
  return state.wallets
    .flatMap((wallet) => {
      const mine = myMembership(wallet);
      return mine?.status === "pending" ? [toInvitation(wallet, mine)] : [];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function findInvitation(invitationId: string) {
  for (const wallet of state.wallets) {
    const mine = myMembership(wallet);
    if (mine?.status === "pending" && `mock-invite-${wallet.id}` === invitationId) return { wallet, mine };
  }
  throw new ApiClientError("Invitation not found", 404);
}

/** TODO(backend E7-02): replaced by `POST /api/v1/invitations/{id}/accept`. */
export async function mockAcceptInvitation(invitationId: string): Promise<MockWalletRecord> {
  await ensureMe();
  const { wallet, mine } = findInvitation(invitationId);
  mine.status = "accepted";
  return toWalletRecord(wallet);
}

/** TODO(backend E7-02): replaced by `POST /api/v1/invitations/{id}/decline` (silent for the owner). */
export async function mockDeclineInvitation(invitationId: string): Promise<void> {
  await ensureMe();
  const { wallet, mine } = findInvitation(invitationId);
  wallet.members = wallet.members.filter((member) => member !== mine);
}

/* --------------------------- transactions ---------------------------- */

/** TODO(backend E7-11): replaced by `GET /api/v1/wallets/{id}/transactions?month=YYYY-MM` (members only). */
export async function mockListTransactions(walletId: string, month: string): Promise<MockTransactionRecord[]> {
  await ensureMe();
  requireMember(walletId);
  return state.transactions
    .filter((transaction) => transaction.walletId === walletId && transaction.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map(toTransactionRecord);
}

export type MockTransactionInput = {
  type: TransactionType;
  amount: number;
  date: string;
  title: string;
  note?: string;
  categoryId?: string | null;
};

function assertNoCategory(input: MockTransactionInput) {
  if (input.categoryId) {
    throw new ApiClientError("Shared wallets don't use categories", 400, { categoryId: "Shared wallets don't use categories" });
  }
}

/** TODO(backend E7-11): replaced by `POST /api/v1/transactions` for a shared wallet (members only; 403 otherwise). */
export async function mockCreateTransaction(
  input: MockTransactionInput & { walletId: string }
): Promise<MockTransactionRecord> {
  await ensureMe();
  requireMember(input.walletId);
  assertNoCategory(input);
  const transaction: MockTransaction = {
    id: nextId("tx"),
    walletId: input.walletId,
    type: input.type,
    amount: input.amount,
    date: input.date,
    title: input.title,
    note: input.note,
    createdBy: MOCK_ME_ID,
  };
  state.transactions.push(transaction);
  return toTransactionRecord(transaction);
}

function findTransaction(id: string) {
  const transaction = state.transactions.find((candidate) => candidate.id === id);
  if (!transaction) throw new ApiClientError("Transaction not found", 404);
  return transaction;
}

/** TODO(backend E7-13): replaced by `PUT /api/v1/transactions/{id}`; any member may edit any row. */
export async function mockUpdateTransaction(id: string, input: MockTransactionInput): Promise<MockTransactionRecord> {
  await ensureMe();
  const transaction = findTransaction(id);
  requireMember(transaction.walletId);
  assertNoCategory(input);
  transaction.type = input.type;
  transaction.amount = input.amount;
  transaction.date = input.date;
  transaction.title = input.title;
  transaction.note = input.note;
  transaction.editedBy = transaction.createdBy === MOCK_ME_ID ? undefined : MOCK_ME_ID;
  return toTransactionRecord(transaction);
}

/** TODO(backend E7-13): replaced by `DELETE /api/v1/transactions/{id}`; any member may delete any row. */
export async function mockDeleteTransaction(id: string): Promise<void> {
  await ensureMe();
  const transaction = findTransaction(id);
  requireMember(transaction.walletId);
  state.transactions = state.transactions.filter((candidate) => candidate !== transaction);
}

/* ----------------------------- home summary ----------------------------- */

/** TODO(backend E7-15): replaced by `GET /api/v1/home/summary?walletId=<shared id>` (members only). */
export async function mockHomeSummary(month: MonthKey, walletId: string): Promise<HomeSummary> {
  await ensureMe();
  const wallet = requireMember(walletId);
  const rows = state.transactions.filter((transaction) => transaction.walletId === walletId && transaction.date.startsWith(month));
  const income = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
  const expense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const net = income - expense;
  const balance = walletBalance(walletId);
  const goal = wallet.isSaving ? wallet.goalAmount : undefined;
  return {
    month,
    walletId,
    balance: {
      hasWallets: true,
      totalBalance: balance,
      savingGoal: goal
        ? {
            walletId,
            walletName: wallet.name,
            goal,
            current: balance,
            percent: Math.max(0, Math.min(100, Math.floor((balance / goal) * 100))),
            remaining: Math.max(0, goal - balance),
            reached: balance >= goal,
          }
        : null,
    },
    income,
    expense,
    net: { net, status: net > 0 ? "surplus" : net < 0 ? "overspending" : "even" },
    topCategories: [],
  };
}
