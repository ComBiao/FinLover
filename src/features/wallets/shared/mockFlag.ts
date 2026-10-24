/**
 * Temporary switch for the shared-wallet mock layer (Epic 7 frontend).
 *
 * The mock layer stands in for API endpoints the backend has not built yet.
 * It is ON unless `NEXT_PUBLIC_SHARED_WALLET_MOCKS=false`. Every mocked call
 * site carries a `TODO(backend E7-xx)` comment; see docs/epic7-frontend-handoff.md
 * for how to switch it off and delete it.
 *
 * Read lazily (not at import time) so tests can toggle it with `vi.stubEnv`.
 */
export function sharedWalletMocksEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHARED_WALLET_MOCKS !== "false";
}

/** Ids created by the mock store start with this prefix, real ids never do. */
export const MOCK_ID_PREFIX = "mock-";

/** True when the mock layer is on AND `id` belongs to a mock wallet/transaction. */
export function isMockTarget(id: string | null | undefined): boolean {
  return sharedWalletMocksEnabled() && typeof id === "string" && id.startsWith(MOCK_ID_PREFIX);
}
