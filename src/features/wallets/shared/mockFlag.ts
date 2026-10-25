/**
 * Temporary switch for the shared-wallet mock layer (Epic 7 frontend).
 *
 * The mock layer stands in for API endpoints the backend has not built yet.
 * It is ON unless `NEXT_PUBLIC_SHARED_WALLET_MOCKS=false` (vitest and the
 * Playwright server set it to false). Every mocked call site carries a
 * `TODO(backend E7-xx)` comment naming the endpoint that replaces it:
 * `grep -rn "TODO(backend" src` lists them all.
 *
 * Switching off: build an endpoint, then test with the flag set to `false` in
 * `.env.local`. Real ids and `mock-` ids coexist, so it can be done one
 * endpoint at a time.
 *
 * Deleting it once every endpoint is real: remove `src/features/wallets/shared/mock/`
 * and this file; remove the `isMockTarget` / `sharedWalletMocksEnabled` branches
 * in walletsService, transactionsService, homeService, membersService and
 * invitationsService; delete `__tests__/sharedWalletMockStore.test.ts` and
 * `serviceSeams.test.ts`; drop the flag from `.env.example`, `vitest.config.ts`
 * and `tests/e2e/start-server.mjs`.
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
