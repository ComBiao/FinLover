// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
import {
  ACTIVE_WALLET_STORAGE_KEY,
  useActiveWallet,
} from "@/features/wallets/store/useActiveWallet";
import type { WalletRef } from "@/features/wallets/resolveActiveWallet";

describe("useActiveWallet store", () => {
  const userWallets: WalletRef[] = [
    { id: "wallet-main", isDefault: true },
    { id: "wallet-saving", isDefault: false },
  ];

  beforeEach(() => {
    useActiveWallet.getState().clear();
  });

  it("starts with null (no wallet selected)", () => {
    expect(useActiveWallet.getState().walletId).toBeNull();
  });

  it("stores only the wallet id when set directly", () => {
    useActiveWallet.getState().setWalletId("wallet-main");
    expect(useActiveWallet.getState().walletId).toBe("wallet-main");
    expect(useActiveWallet.getState().activeWalletId).toBe("wallet-main");
  });

  it("selectWallet accepts an existing wallet and updates walletId", () => {
    const accepted = useActiveWallet.getState().selectWallet("wallet-saving", userWallets);
    expect(accepted).toBe(true);
    expect(useActiveWallet.getState().walletId).toBe("wallet-saving");
    expect(useActiveWallet.getState().activeWalletId).toBe("wallet-saving");
  });

  it("selectWallet rejects an invalid or unauthorized wallet and keeps current wallet selected", () => {
    useActiveWallet.getState().setWalletId("wallet-main");

    const accepted = useActiveWallet.getState().selectWallet("unauthorized-wallet-id", userWallets);
    expect(accepted).toBe(false);
    expect(useActiveWallet.getState().walletId).toBe("wallet-main");
    expect(useActiveWallet.getState().activeWalletId).toBe("wallet-main");
  });

  it("resolveFallback falls back to the default wallet when saved id no longer exists", () => {
    useActiveWallet.getState().setWalletId("deleted-wallet-id");

    const resolved = useActiveWallet.getState().resolveFallback(userWallets);
    expect(resolved).toBe("wallet-main");
    expect(useActiveWallet.getState().walletId).toBe("wallet-main");
    expect(useActiveWallet.getState().activeWalletId).toBe("wallet-main");
  });

  it("resolveFallback falls back to the first wallet when saved id is deleted and no default exists", () => {
    const walletsWithoutDefault: WalletRef[] = [
      { id: "wallet-first", isDefault: false },
      { id: "wallet-second", isDefault: false },
    ];
    useActiveWallet.getState().setWalletId("deleted-wallet-id");

    const resolved = useActiveWallet.getState().resolveFallback(walletsWithoutDefault);
    expect(resolved).toBe("wallet-first");
    expect(useActiveWallet.getState().walletId).toBe("wallet-first");
    expect(useActiveWallet.getState().activeWalletId).toBe("wallet-first");
  });

  it("resolveFallback keeps current id when it still exists in the user's wallets", () => {
    useActiveWallet.getState().setWalletId("wallet-saving");

    const resolved = useActiveWallet.getState().resolveFallback(userWallets);
    expect(resolved).toBe("wallet-saving");
    expect(useActiveWallet.getState().walletId).toBe("wallet-saving");
    expect(useActiveWallet.getState().activeWalletId).toBe("wallet-saving");
  });

  it("clears the store on clear() (logout) and resets walletId to null", () => {
    useActiveWallet.getState().setWalletId("wallet-main");
    useActiveWallet.getState().clear();

    expect(useActiveWallet.getState().walletId).toBeNull();
    expect(useActiveWallet.getState().activeWalletId).toBe("all");
  });

  it("persists selection to localStorage", () => {
    useActiveWallet.getState().setWalletId("wallet-saving");

    const raw = localStorage.getItem(ACTIVE_WALLET_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.walletId).toBe("wallet-saving");
  });
});

describe("useActiveWallet (#77)", () => {
  beforeEach(() => {
    useTransactionFilters.getState().resetFilters();
    useActiveWallet.setState({ activeWalletId: "all", walletId: null });
  });

  it("defaults to all", () => {
    expect(useActiveWallet.getState().activeWalletId).toBe("all");
  });

  it("updates active wallet and syncs to useTransactionFilters", () => {
    useActiveWallet.getState().setActiveWalletId("60d5ecb8b5c9c61234567890");

    expect(useActiveWallet.getState().activeWalletId).toBe("60d5ecb8b5c9c61234567890");
    expect(useTransactionFilters.getState().filters.walletId).toBe("60d5ecb8b5c9c61234567890");
  });

  it("setting active wallet to 'all' clears filter in useTransactionFilters", () => {
    useActiveWallet.getState().setActiveWalletId("60d5ecb8b5c9c61234567890");
    useActiveWallet.getState().setActiveWalletId("all");

    expect(useActiveWallet.getState().activeWalletId).toBe("all");
    expect(useTransactionFilters.getState().filters.walletId).toBeUndefined();
  });
});
