import { beforeEach, describe, expect, it } from "vitest";

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
});

