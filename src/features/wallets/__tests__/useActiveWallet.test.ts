// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { restoreTransactionFilters, useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
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

  it("saves day selections as calendar dates and restores existing ISO snapshots", () => {
    useTransactionFilters.getState().setPeriod({
      mode: "day", from: new Date(2026, 0, 3), to: new Date(2026, 0, 5),
    });
    const saved = JSON.parse(window.sessionStorage.getItem("transactionFilters")!);
    expect(saved.period).toEqual({ mode: "day", from: "2026-01-03", to: "2026-01-05" });
    expect(saved.anchor).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    saved.period.from = new Date(2026, 0, 3).toISOString();
    window.sessionStorage.setItem("transactionFilters", JSON.stringify(saved));
    restoreTransactionFilters();
    expect(useTransactionFilters.getState().period).toEqual({
      mode: "day", from: new Date(2026, 0, 3), to: new Date(2026, 0, 5),
    });
  });
});

