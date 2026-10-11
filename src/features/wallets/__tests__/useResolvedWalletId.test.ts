// @vitest-environment jsdom
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useResolvedWalletId } from "../hooks/useResolvedWalletId";
import { useActiveWallet } from "../store/useActiveWallet";
import * as walletsService from "../walletsService";



import type { Wallet } from "@/types/wallet";

const mockApiRecords: walletsService.WalletApiRecord[] = [
  { id: "wallet-default", name: "Default Wallet", balance: 100, isDefault: true, isSaving: false },
  { id: "wallet-other", name: "Other Wallet", balance: 200, isDefault: false, isSaving: false },
];

const mockWallets: Wallet[] = mockApiRecords.map(walletsService.mapWalletRecord);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useResolvedWalletId", () => {
  beforeEach(() => {
    useActiveWallet.getState().clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves to default wallet when saved id is empty/null", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useResolvedWalletId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.wallets).toHaveLength(2));

    expect(result.current.walletId).toBe("wallet-default");
    expect(result.current.activeWallet?.name).toBe("Default Wallet");
  });

  it("resolves to saved id when it exists in wallets", async () => {
    useActiveWallet.getState().setWalletId("wallet-other");
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useResolvedWalletId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.wallets).toHaveLength(2));

    expect(result.current.walletId).toBe("wallet-other");
    expect(result.current.activeWallet?.name).toBe("Other Wallet");
  });

  it("falls back to default wallet when saved id is not in the list (e.g. deleted)", async () => {
    useActiveWallet.getState().setWalletId("deleted-wallet-id");
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useResolvedWalletId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.wallets).toHaveLength(2));

    expect(result.current.walletId).toBe("wallet-default");
    expect(result.current.activeWallet?.name).toBe("Default Wallet");
  });

  it("selectWallet rejects invalid id and keeps current wallet selected", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useResolvedWalletId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.wallets).toHaveLength(2));

    expect(result.current.walletId).toBe("wallet-default");

    act(() => {
      const accepted = result.current.selectWallet("non-existent-id");
      expect(accepted).toBe(false);
    });

    expect(result.current.walletId).toBe("wallet-default");
  });

  it("selectWallet updates selection when valid id is selected", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useResolvedWalletId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.wallets).toHaveLength(2));

    act(() => {
      const accepted = result.current.selectWallet("wallet-other");
      expect(accepted).toBe(true);
    });

    expect(result.current.walletId).toBe("wallet-other");
    expect(result.current.activeWallet?.name).toBe("Other Wallet");
  });

  it("persists null and clears stale walletId in store when wallets list is empty", async () => {
    useActiveWallet.getState().setWalletId("stale-wallet-id");
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([]);

    const { result } = renderHook(() => useResolvedWalletId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    await waitFor(() => expect(result.current.walletId).toBeNull());

    expect(result.current.walletId).toBeNull();
    expect(result.current.activeWallet).toBeUndefined();
    expect(useActiveWallet.getState().walletId).toBeNull();
  });
});

