// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
import { useActiveWallet } from "../store/useActiveWallet";

describe("useActiveWallet (#77)", () => {
  beforeEach(() => {
    useTransactionFilters.getState().resetFilters();
    useActiveWallet.setState({ activeWalletId: "all" });
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

  it("keeps saved transaction filters when Home restores its wallet after refresh", async () => {
    window.sessionStorage.setItem("transactionFilters", JSON.stringify({
      filters: { search: "groceries", walletId: "wallet-a" },
      period: { mode: "month", monthKey: "2025-09" },
      anchor: new Date(2025, 8, 15),
    }));
    vi.resetModules();
    const { useActiveWallet: freshWallet } = await import("../store/useActiveWallet");
    const { useTransactionFilters: freshFilters } = await import("@/features/transactions/store/useTransactionFilters");

    expect(freshFilters.getState().filters.search).toBe("groceries");
    freshWallet.getState().setActiveWalletId("wallet-a");

    expect(freshFilters.getState().period).toEqual({ mode: "month", monthKey: "2025-09" });
    expect(JSON.parse(window.sessionStorage.getItem("transactionFilters")!).filters.search).toBe("groceries");
  });
});

