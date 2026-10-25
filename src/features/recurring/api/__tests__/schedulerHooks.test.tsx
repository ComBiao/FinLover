// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  schedulerKeys,
  useCreateScheduler,
  useDeleteScheduler,
  useSchedulers,
  useUpdateScheduler,
  useUpdateSchedulerStatus,
  type SchedulerRule,
} from "../schedulers";
import { WALLETS_QUERY_KEY } from "@/features/wallets/hooks/useWallets";
import { TRANSACTIONS_QUERY_KEY } from "@/features/transactions/hooks/useTransactions";
import { todayISODate } from "@/lib/utils";

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
});

function createTestWrapper(queryClient: QueryClient) {
  return function TestProvider({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("Schedulers Query and Mutation Hooks (Issue #178 Step 2)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("useSchedulers", () => {
    it("queries schedulers and populates cache", async () => {
      const mockBackendList = [
        {
          id: "r1",
          walletId: "w1",
          categoryId: "c1",
          type: "expense",
          amount: 500,
          title: "Gym",
          startDate: "2026-10-01",
          frequency: "monthly",
          interval: 1,
          end: { type: "never" },
          status: "active",
          createdCount: 1,
          nextDueDate: "2026-11-01",
          canManage: true,
        },
      ];

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockBackendList })
      ));

      const { result } = renderHook(() => useSchedulers(), {
        wrapper: createTestWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.[0].title).toBe("Gym");
      expect(result.current.data?.[0].id).toBe("r1");
    });
  });

  describe("useCreateScheduler cache invalidation (Step 2.3 & 4.1)", () => {
    it("Case A (start_date === today): invalidates schedulers, wallets, and transactions caches", async () => {
      const today = todayISODate();
      const mockCreated = {
        id: "created-1",
        walletId: "w1",
        categoryId: null,
        type: "expense",
        amount: 300,
        title: "Immediate Rule",
        startDate: today,
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "active",
        createdCount: 1, // Posted immediately!
        nextDueDate: "2026-11-24",
        canManage: true,
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockCreated }, true, 201)
      ));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateScheduler(), {
        wrapper: createTestWrapper(queryClient),
      });

      await result.current.mutateAsync({
        walletId: "w1",
        type: "expense",
        amount: 300,
        title: "Immediate Rule",
        startDate: today,
        frequency: "monthly",
        interval: 1,
      });

      // Assert that schedulers, wallets, and transactions caches are ALL invalidated
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schedulerKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: WALLETS_QUERY_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: TRANSACTIONS_QUERY_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["home-summary"] });
    });

    it("Case B (start_date > today): invalidates schedulers cache but NOT wallets or transactions caches", async () => {
      const futureDate = "2099-12-31";
      const mockCreated = {
        id: "created-2",
        walletId: "w1",
        categoryId: null,
        type: "expense",
        amount: 500,
        title: "Future Rule",
        startDate: futureDate,
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "active",
        createdCount: 0, // No immediate run!
        nextDueDate: futureDate,
        canManage: true,
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockCreated }, true, 201)
      ));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateScheduler(), {
        wrapper: createTestWrapper(queryClient),
      });

      await result.current.mutateAsync({
        walletId: "w1",
        type: "expense",
        amount: 500,
        title: "Future Rule",
        startDate: futureDate,
        frequency: "monthly",
        interval: 1,
      });

      // Schedulers cache IS invalidated
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schedulerKeys.all });
      // Wallets and transactions caches are NOT invalidated
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: WALLETS_QUERY_KEY });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: TRANSACTIONS_QUERY_KEY });
    });
  });

  describe("useUpdateScheduler cache invalidation", () => {
    it("refreshes schedulers only, even when the start date is today (PUT never posts)", async () => {
      const today = todayISODate();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({
          status: true,
          data: {
            id: "r1", walletId: "w1", categoryId: null, type: "expense", amount: 10,
            title: "Rule", startDate: today, frequency: "monthly", interval: 1,
            end: { type: "never" }, status: "active", createdCount: 0,
            nextDueDate: today, canManage: true,
          },
        })
      ));
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateScheduler(), {
        wrapper: createTestWrapper(queryClient),
      });
      await result.current.mutateAsync({
        id: "r1",
        payload: { walletId: "w1", type: "expense", amount: 10, startDate: today, frequency: "monthly", interval: 1 },
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: schedulerKeys.all });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: WALLETS_QUERY_KEY });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: TRANSACTIONS_QUERY_KEY });
    });
  });

  describe("useUpdateSchedulerStatus optimistic updates & rollback", () => {
    const initialRules: SchedulerRule[] = [
      {
        id: "r1",
        walletId: "w1",
        wallet_id: "w1",
        categoryId: null,
        category_id: null,
        type: "expense",
        amount: 500,
        title: "Rule 1",
        startDate: "2026-10-01",
        start_date: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        intervalN: 1,
        intervalUnit: "months",
        end: { type: "never" },
        status: "active",
        createdCount: 1,
        postedCount: 1,
        nextDueDate: "2026-11-01",
        nextRunDate: "2026-11-01",
        next_run_date: "2026-11-01",
        canManage: true,
        createdAt: "2026-10-01",
        created_at: "2026-10-01",
        updatedAt: "2026-10-01",
        updated_at: "2026-10-01",
      },
    ];

    it("optimistically updates rule status to paused on success", async () => {
      queryClient.setQueryData(schedulerKeys.list(), initialRules);

      const mockUpdated = {
        id: "r1",
        walletId: "w1",
        categoryId: null,
        type: "expense",
        amount: 500,
        title: "Rule 1",
        startDate: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "paused",
        createdCount: 1,
        nextDueDate: "2026-11-01",
        canManage: true,
      };

      vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
        // While in-flight, cache should already be optimistically updated to paused!
        const cached = queryClient.getQueryData<SchedulerRule[]>(schedulerKeys.list());
        expect(cached?.[0].status).toBe("paused");
        return jsonResponse({ status: true, data: mockUpdated });
      }));

      const { result } = renderHook(() => useUpdateSchedulerStatus(), {
        wrapper: createTestWrapper(queryClient),
      });

      await result.current.mutateAsync({ id: "r1", payload: { action: "pause", status: "paused" } });

      const finalCache = queryClient.getQueryData<SchedulerRule[]>(schedulerKeys.list());
      expect(finalCache?.[0].status).toBe("paused");
    });

    it("rolls back to previous active status on failure", async () => {
      queryClient.setQueryData(schedulerKeys.list(), initialRules);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ status: false, error: { message: "Network failure" } }, false, 500)
      ));

      const { result } = renderHook(() => useUpdateSchedulerStatus(), {
        wrapper: createTestWrapper(queryClient),
      });

      try {
        await result.current.mutateAsync({ id: "r1", payload: { action: "pause", status: "paused" } });
      } catch {
        // Error expected
      }

      // Check that cache rolled back to 'active'
      const restored = queryClient.getQueryData<SchedulerRule[]>(schedulerKeys.list());
      expect(restored?.[0].status).toBe("active");
    });
  });

  describe("useDeleteScheduler optimistic updates & rollback", () => {
    const initialRules: SchedulerRule[] = [
      {
        id: "r1",
        walletId: "w1",
        wallet_id: "w1",
        categoryId: null,
        category_id: null,
        type: "expense",
        amount: 500,
        title: "Rule 1",
        startDate: "2026-10-01",
        start_date: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        intervalN: 1,
        intervalUnit: "months",
        end: { type: "never" },
        status: "active",
        createdCount: 1,
        postedCount: 1,
        nextDueDate: "2026-11-01",
        nextRunDate: "2026-11-01",
        next_run_date: "2026-11-01",
        canManage: true,
        createdAt: "2026-10-01",
        created_at: "2026-10-01",
        updatedAt: "2026-10-01",
        updated_at: "2026-10-01",
      },
      {
        id: "r2",
        walletId: "w1",
        wallet_id: "w1",
        categoryId: null,
        category_id: null,
        type: "income",
        amount: 25000,
        title: "Rule 2",
        startDate: "2026-10-01",
        start_date: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        intervalN: 1,
        intervalUnit: "months",
        end: { type: "never" },
        status: "active",
        createdCount: 1,
        postedCount: 1,
        nextDueDate: "2026-11-01",
        nextRunDate: "2026-11-01",
        next_run_date: "2026-11-01",
        canManage: true,
        createdAt: "2026-10-01",
        created_at: "2026-10-01",
        updatedAt: "2026-10-01",
        updated_at: "2026-10-01",
      },
    ];

    it("optimistically removes rule from list on delete", async () => {
      queryClient.setQueryData(schedulerKeys.list(), initialRules);

      vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
        // While delete is in-flight, r1 should already be filtered out!
        const cached = queryClient.getQueryData<SchedulerRule[]>(schedulerKeys.list());
        expect(cached?.map((r) => r.id)).toEqual(["r2"]);
        return jsonResponse({ status: true, data: null });
      }));

      const { result } = renderHook(() => useDeleteScheduler(), {
        wrapper: createTestWrapper(queryClient),
      });

      await result.current.mutateAsync("r1");

      const finalCache = queryClient.getQueryData<SchedulerRule[]>(schedulerKeys.list());
      expect(finalCache?.map((r) => r.id)).toEqual(["r2"]);
    });

    it("rolls back deleted item if delete operation fails", async () => {
      queryClient.setQueryData(schedulerKeys.list(), initialRules);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ status: false, error: { message: "Server error deleting rule" } }, false, 500)
      ));

      const { result } = renderHook(() => useDeleteScheduler(), {
        wrapper: createTestWrapper(queryClient),
      });

      try {
        await result.current.mutateAsync("r1");
      } catch {
        // Expected
      }

      // Rollback restored both r1 and r2
      const restored = queryClient.getQueryData<SchedulerRule[]>(schedulerKeys.list());
      expect(restored?.map((r) => r.id)).toEqual(["r1", "r2"]);
    });
  });
});

