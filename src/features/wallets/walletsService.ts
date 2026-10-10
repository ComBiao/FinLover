import { PiggyBank, Wallet as WalletIcon } from "lucide-react";
import type { Wallet } from "@/types/wallet";

export type WalletApiRecord = {
  id: string;
  name: string;
  balance: number;
  isDefault?: boolean;
  color?: string;
  isSaving?: boolean;
  goalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateWalletInput = {
  name: string;
  color?: string;
  isSaving?: boolean;
  goalAmount?: number;
};

export type UpdateWalletInput = {
  name?: string;
  color?: string;
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
    icon: isSaving ? PiggyBank : WalletIcon,
  };
}

/**
 * Fetches the caller's wallets from GET /api/v1/wallets.
 */
export async function getWallets(): Promise<Wallet[]> {
  const response = await fetch("/api/v1/wallets", { credentials: "same-origin" });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new Error(payload.error?.message ?? "Failed to fetch wallets");
  }

  const list = Array.isArray(payload.data) ? payload.data : [];
  return list.map(mapWalletRecord);
}

/**
 * Creates a new wallet via POST /api/v1/wallets.
 */
export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const response = await fetch("/api/v1/wallets", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new Error(payload.error?.message ?? "Failed to create wallet");
  }

  return mapWalletRecord(payload.data);
}

/**
 * Updates a wallet's name and/or color via PUT /api/v1/wallets/:id.
 */
export async function updateWallet(id: string, input: UpdateWalletInput): Promise<Wallet> {
  const response = await fetch(`/api/v1/wallets/${id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new Error(payload.error?.message ?? "Failed to update wallet");
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
  const response = await fetch(`/api/v1/wallets/${id}/saving`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new Error(payload.error?.message ?? "Failed to update wallet saving status");
  }

  return mapWalletRecord(payload.data);
}

/**
 * Deletes a wallet and all its transactions via DELETE /api/v1/wallets/:id.
 */
export async function deleteWallet(id: string): Promise<void> {
  const response = await fetch(`/api/v1/wallets/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new Error(payload.error?.message ?? "Failed to delete wallet");
  }
}

