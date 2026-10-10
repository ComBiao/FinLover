import { getApi } from "@/lib/api/client";

/** Shape returned by `GET /api/v1/wallets` (after the versioned output map). */
export type WalletDTO = {
  id: string;
  name: string;
  balance: number;
  isDefault: boolean;
  color?: string;
  isSaving: boolean;
  goalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Fetches all wallets owned by the authenticated user. */
export async function fetchWallets(): Promise<WalletDTO[]> {
  return getApi<WalletDTO[]>("/api/v1/wallets");
}
