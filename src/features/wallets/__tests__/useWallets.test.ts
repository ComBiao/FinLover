// @vitest-environment jsdom
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { useWallets } from "../hooks/useWallets";
import * as walletService from "../walletService";

afterEach(() => {
  vi.restoreAllMocks();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useWallets", () => {
  it("fetches and returns the user's wallets using TanStack Query", async () => {
    const mockWallets: walletService.WalletDTO[] = [
      {
        id: "64f1a2b3c4d5e6f7a8b9c0d1",
        name: "Main Wallet",
        balance: 1500,
        isDefault: true,
        isSaving: false,
      },
      {
        id: "64f1a2b3c4d5e6f7a8b9c0d2",
        name: "Vacation Fund",
        balance: 5000,
        isDefault: false,
        isSaving: true,
        goalAmount: 10000,
      },
    ];

    vi.spyOn(walletService, "fetchWallets").mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockWallets);
    expect(result.current.data).toHaveLength(2);
  });
});

