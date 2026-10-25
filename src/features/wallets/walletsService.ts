import { ApiClientError, deleteApi } from "@/lib/api/client";
import type { Wallet } from "@/types/wallet";
import { isMockTarget, sharedWalletMocksEnabled } from "@/features/wallets/shared/mockFlag";
import {
  mockCreateWallet,
  mockDeleteWallet,
  mockListWallets,
  mockSetSaving,
  mockUpdateWallet,
} from "@/features/wallets/shared/mock/sharedWalletMockStore";
import type { SharedWalletFields } from "@/features/wallets/shared/types";
import { resolveWalletIcon } from "./walletIcons";

export type WalletApiRecord = SharedWalletFields & {
  id: string;
  name: string;
  balance: number;
  isDefault?: boolean;
  color?: string;
  icon?: string;
  isSaving?: boolean;
  goalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  membersPreview?: SharedWalletFields['members'];
};

export type CreateWalletInput = {
  name: string;
  color?: string;
  icon?: string;
  isSaving?: boolean;
  goalAmount?: number;
  /**
   * Creates a shared wallet (the caller becomes its Owner, balance starts at ฿0).
   * TODO(backend E7-02): `POST /api/v1/wallets` accepts `isShared`.
   */
  isShared?: boolean;
};

export type UpdateWalletInput = {
  name?: string;
  color?: string;
  icon?: string;
};

export type UpdateWalletSavingInput = {
  isSaving: boolean;
  goalAmount?: number;
};

export function mapWalletRecord(record: WalletApiRecord): Wallet {
  const isSaving = Boolean(record.isSaving);
  const goal = record.goalAmount ?? null;

  return {
    id: record.id,
    name: record.name,
    balance: record.balance,
    isDefault: record.isDefault,
    color: record.color ?? "#4A4757",
    isSaving,
    savingGoal: goal,
    goalAmount: goal,
    type: isSaving ? "savings" : "cash",
    icon: resolveWalletIcon(record.icon, isSaving),
    iconName: record.icon,
    ...(record.isShared
      ? {
          isShared: true,
          role: record.role,
          memberCount: record.memberCount,
          members: record.members ?? record.membersPreview,
          ownerName: record.ownerName,
        }
      : {}),
  };
}

/**
 * Fetches the caller's wallets from GET /api/v1/wallets.
 */
export async function getWallets(): Promise<Wallet[]> {
  const response = await fetch("/api/v1/wallets", { credentials: "same-origin" });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new ApiClientError(payload.error?.message ?? "Failed to fetch wallets", response.status, payload.error?.fields);
  }

  const list = Array.isArray(payload.data) ? payload.data : [];
  const wallets: Wallet[] = list.map(mapWalletRecord);

  // TODO(backend E7-01b): remove. `GET /api/v1/wallets` will itself include the
  // shared wallets the caller belongs to (isShared, role, memberCount, members, ownerName).
  if (sharedWalletMocksEnabled()) {
    wallets.push(...(await mockListWallets()).map(mapWalletRecord));
  }
  return wallets;
}

/**
 * Creates a new wallet via POST /api/v1/wallets.
 */
export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  // TODO(backend E7-02): remove; the real POST /api/v1/wallets handles `isShared`.
  if (input.isShared && sharedWalletMocksEnabled()) {
    return mapWalletRecord(
      await mockCreateWallet({
        name: input.name,
        color: input.color,
        icon: input.icon,
        isSaving: input.isSaving,
        goalAmount: input.goalAmount,
      })
    );
  }

  const response = await fetch("/api/v1/wallets", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new ApiClientError(payload.error?.message ?? "Failed to create wallet", response.status, payload.error?.fields);
  }

  return mapWalletRecord(payload.data);
}

/**
 * Updates a wallet's name and/or color via PUT /api/v1/wallets/:id.
 */
export async function updateWallet(id: string, input: UpdateWalletInput): Promise<Wallet> {
  // TODO(backend E7-01b): remove; PUT /api/v1/wallets/{id} will serve shared wallets (owner only).
  if (isMockTarget(id)) return mapWalletRecord(await mockUpdateWallet(id, input));

  const response = await fetch(`/api/v1/wallets/${id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new ApiClientError(payload.error?.message ?? "Failed to update wallet", response.status, payload.error?.fields);
  }

  return mapWalletRecord(payload.data);
}

/**
 * Toggles a wallet's saving status and goal via PATCH /api/v1/wallets/:id/saving.
 */
export async function updateWalletSaving(
  id: string,
  input: UpdateWalletSavingInput
): Promise<Wallet> {
  // TODO(backend E7-01b): remove; PATCH /api/v1/wallets/{id}/saving will serve shared wallets (owner only).
  if (isMockTarget(id)) return mapWalletRecord(await mockSetSaving(id, input));

  const response = await fetch(`/api/v1/wallets/${id}/saving`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new ApiClientError(payload.error?.message ?? "Failed to update wallet saving status", response.status, payload.error?.fields);
  }

  return mapWalletRecord(payload.data);
}

/**
 * Deletes a wallet and all its transactions via DELETE /api/v1/wallets/:id.
 */
export async function deleteWallet(id: string): Promise<void> {
  // TODO(backend E7-09-API): remove; DELETE /api/v1/wallets/{id} will handle shared wallets (owner only, 403 for a contributor).
  if (isMockTarget(id)) return mockDeleteWallet(id);

  return deleteApi(`/api/v1/wallets/${id}`);
}

