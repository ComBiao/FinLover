export type WalletRef = { id: string; isDefault?: boolean };

/**
 * Resolves the active wallet id against the user's available wallets.
 *
 * Rules:
 * 1. While wallets are loading (undefined), return the stored id.
 * 2. If the user has no wallets ([]), return null.
 * 3. If the stored id matches a wallet owned by the user, return it.
 * 4. If the saved id no longer exists (deleted or unauthorized) or is null,
 *    fall back to the default wallet (isDefault === true), then the first wallet in the list.
 */
export function resolveActiveWalletId(
  storedId: string | null | undefined,
  wallets: WalletRef[] | undefined
): string | null {
  if (wallets === undefined) return storedId ?? null;
  if (wallets.length === 0) return null;
  if (storedId && wallets.some((w) => w.id === storedId)) {
    return storedId;
  }
  const defaultWallet = wallets.find((w) => Boolean(w.isDefault));
  return defaultWallet ? defaultWallet.id : wallets[0].id;
}

/**
 * Validates a wallet selection request.
 *
 * Rules:
 * - If the requested id is found in availableWallets, accept it.
 * - If the requested id does not exist or isn't owned by the user, reject it
 *   and keep currentId selected.
 */
export function selectWallet(
  requestedId: string,
  currentId: string | null,
  availableWallets: WalletRef[] | undefined
): { selectedId: string | null; accepted: boolean } {
  if (!availableWallets || !availableWallets.some((w) => w.id === requestedId)) {
    return { selectedId: currentId, accepted: false };
  }
  return { selectedId: requestedId, accepted: true };
}
