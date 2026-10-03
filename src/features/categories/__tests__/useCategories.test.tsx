// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCategories } from "../hooks/useCategories";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

describe("useCategories — createCategory wires POST /api/v1/categories (US5-1)", () => {
  it("sends name/type and the Tailwind swatch translated to hex, then appends the server's id locally", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          status: true,
          data: {
            id: "507f1f77bcf86cd799439011",
            name: "Subscriptions",
            type: "expense",
            color: "#2563eb",
            isSystem: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        { status: 201 }
      )
    );
    const { result } = renderHook(() => useCategories([], []), { wrapper });

    await act(async () => {
      await result.current.createCategory("expense", {
        name: "Subscriptions",
        iconName: "Zap",
        color: "bg-blue-100 text-blue-600",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/categories",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ name: "Subscriptions", type: "expense", color: "#2563eb" }),
      })
    );
    // The row renders from the class string the user picked, not the hex
    // the server echoes back — see the comment in `createCategory`.
    expect(result.current.expenses).toEqual([
      { id: "507f1f77bcf86cd799439011", name: "Subscriptions", iconName: "Zap", color: "bg-blue-100 text-blue-600" },
    ]);
    expect(result.current.incomes).toEqual([]);
  });

  it("omits color entirely when none was picked, rather than sending an empty string", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          status: true,
          data: {
            id: "507f1f77bcf86cd799439012",
            name: "Misc",
            type: "income",
            isSystem: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        { status: 201 }
      )
    );
    const { result } = renderHook(() => useCategories([], []), { wrapper });

    await act(async () => {
      await result.current.createCategory("income", { name: "Misc", iconName: "MoreHorizontal" });
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "Misc", type: "income" });
  });

  it("rejects with the server's message on a duplicate-name conflict, leaving local state untouched", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { status: false, error: { code: "CONFLICT", message: "A category with this name already exists" } },
        { status: 409 }
      )
    );
    const { result } = renderHook(() => useCategories([], []), { wrapper });

    await expect(
      act(async () => {
        await result.current.createCategory("expense", { name: "Food", iconName: "Utensils" });
      })
    ).rejects.toThrow("A category with this name already exists");

    expect(result.current.expenses).toEqual([]);
  });
});
