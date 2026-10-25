/**
 * Switch for the shared-wallet in-memory mock layer (Epic 7).
 *
 * Defaults to OFF (`false`). Set `NEXT_PUBLIC_SHARED_WALLET_MOCKS=true` to opt in
 * to the in-memory mock layer for testing UI in isolation without a database.
 * Real ids and `mock-` ids coexist, so tests can toggle it with `vi.stubEnv`.
 */
export function sharedWalletMocksEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHARED_WALLET_MOCKS === "true";
}

/** Ids created by the mock store start with this prefix, real ids never do. */
export const MOCK_ID_PREFIX = "mock-";

/** True when the mock layer is on AND `id` belongs to a mock wallet/transaction. */
export function isMockTarget(id: string | null | undefined): boolean {
  return sharedWalletMocksEnabled() && typeof id === "string" && id.startsWith(MOCK_ID_PREFIX);
}
