import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createScheduler,
  deleteScheduler,
  getScheduler,
  getSchedulers,
  normalizeSchedulerPayload,
  SchedulerApiError,
  updateScheduler,
  updateSchedulerStatus,
  type CreateSchedulerPayload,
  type SchedulerFrequency,
} from "../schedulers";

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
});

describe("Schedulers Client API (Issue #178 Step 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("normalizeSchedulerPayload", () => {
    it("normalizes camelCase and snake_case fields correctly", () => {
      const normalized = normalizeSchedulerPayload({
        wallet_id: "w123",
        category_id: "c456",
        type: "expense",
        amount: 250,
        title: "Gym Membership",
        start_date: "2026-11-01",
        intervalN: 2,
        intervalUnit: "weeks",
        endType: "count",
        totalOccurrences: 10,
      });

      expect(normalized).toEqual({
        walletId: "w123",
        categoryId: "c456",
        type: "expense",
        amount: 250,
        title: "Gym Membership",
        note: undefined,
        startDate: "2026-11-01",
        frequency: "weekly",
        interval: 2,
        end: { type: "count", count: 10 },
      });
    });

    it("handles end date format and uppercase frequency", () => {
      const normalized = normalizeSchedulerPayload({
        walletId: "w1",
        type: "income",
        amount: 50000,
        title: "Salary",
        startDate: "2026-10-25",
        frequency: "MONTHLY" as unknown as SchedulerFrequency,
        interval: 1,
        endDate: "2027-10-25",
        endType: "date",
      });

      expect(normalized.frequency).toBe("monthly");
      expect(normalized.end).toEqual({ type: "endDate", endDate: "2027-10-25" });
    });

    it("throws SchedulerApiError if walletId is missing", () => {
      expect(() =>
        normalizeSchedulerPayload({
          type: "expense",
          amount: 100,
        } as unknown as CreateSchedulerPayload)
      ).toThrow(SchedulerApiError);
    });

    it("throws instead of defaulting when type, amount, start date or cadence is missing", () => {
      const base = { walletId: "w1", type: "income", amount: 10, startDate: "2026-11-01", frequency: "weekly", interval: 1 };
      for (const field of Object.keys(base).filter((k) => k !== "walletId")) {
        const partial: Record<string, unknown> = { ...base };
        delete partial[field];
        expect(() => normalizeSchedulerPayload(partial as unknown as CreateSchedulerPayload)).toThrow(SchedulerApiError);
      }
    });
  });

  describe("getSchedulers", () => {
    it("fetches schedulers list from GET /api/v1/schedulers", async () => {
      const mockBackendList = [
        {
          id: "sched-1",
          walletId: "w1",
          categoryId: "c1",
          type: "expense",
          amount: 419,
          title: "Netflix",
          note: "Family plan",
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

      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockBackendList })
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await getSchedulers();

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/schedulers", { credentials: "same-origin" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sched-1");
      expect(result[0].wallet_id).toBe("w1");
      expect(result[0].nextRunDate).toBe("2026-11-01");
      expect(result[0].intervalUnit).toBe("months");
    });

    it("passes filter query parameters when provided", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: [] })
      );
      vi.stubGlobal("fetch", fetchMock);

      await getSchedulers({ wallet_id: "w-target", status: "active" });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/schedulers?walletId=w-target&status=active",
        { credentials: "same-origin" }
      );
    });
  });

  describe("getScheduler", () => {
    it("fetches single scheduler by id", async () => {
      const mockRule = {
        id: "s1",
        walletId: "w1",
        categoryId: "c1",
        type: "expense",
        amount: 100,
        title: "Spotify",
        startDate: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "active",
        createdCount: 0,
        nextDueDate: "2026-10-01",
        canManage: true,
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ status: true, data: mockRule }))
      );

      const res = await getScheduler("s1");
      expect(res.id).toBe("s1");
      expect(res.title).toBe("Spotify");
    });
  });

  describe("createScheduler", () => {
    it("sends POST /api/v1/schedulers with normalized payload and returns mapped entity", async () => {
      const mockCreated = {
        id: "new-sched-id",
        walletId: "w1",
        categoryId: "c1",
        type: "expense",
        amount: 1500,
        title: "Internet",
        startDate: "2026-10-24",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "active",
        createdCount: 1,
        nextDueDate: "2026-11-24",
        canManage: true,
      };

      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockCreated }, true, 201)
      );
      vi.stubGlobal("fetch", fetchMock);

      const res = await createScheduler({
        wallet_id: "w1",
        type: "expense",
        amount: 1500,
        title: "Internet",
        start_date: "2026-10-24",
        intervalN: 1,
        intervalUnit: "months",
        endType: "never",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/schedulers",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId: "w1",
            type: "expense",
            amount: 1500,
            title: "Internet",
            startDate: "2026-10-24",
            frequency: "monthly",
            interval: 1,
            end: { type: "never" },
          }),
        })
      );

      expect(res.id).toBe("new-sched-id");
      expect(res.createdCount).toBe(1);
      expect(res.nextRunDate).toBe("2026-11-24");
    });
  });

  describe("updateScheduler", () => {
    it("sends PUT /api/v1/schedulers/:id with future-only changes", async () => {
      const mockUpdated = {
        id: "s1",
        walletId: "w1",
        categoryId: "c1",
        type: "expense",
        amount: 2000,
        title: "Updated Gym",
        startDate: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "active",
        createdCount: 1,
        nextDueDate: "2026-11-01",
        canManage: true,
      };

      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockUpdated })
      );
      vi.stubGlobal("fetch", fetchMock);

      const res = await updateScheduler("s1", {
        walletId: "w1",
        type: "expense",
        amount: 2000,
        title: "Updated Gym",
        startDate: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/schedulers/s1",
        expect.objectContaining({
          method: "PUT",
        })
      );
      expect(res.amount).toBe(2000);
    });
  });

  describe("updateSchedulerStatus", () => {
    it("sends PATCH /api/v1/schedulers/:id/status with action pause", async () => {
      const mockPaused = {
        id: "s1",
        walletId: "w1",
        categoryId: "c1",
        type: "expense",
        amount: 100,
        title: "Subscription",
        startDate: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "paused",
        createdCount: 1,
        nextDueDate: "2026-11-01",
        canManage: true,
      };

      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockPaused })
      );
      vi.stubGlobal("fetch", fetchMock);

      const res = await updateSchedulerStatus("s1", { status: "PAUSED" });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/schedulers/s1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ action: "pause" }),
        })
      );
      expect(res.status).toBe("paused");
    });

    it("sends action resume when status is ACTIVE", async () => {
      const mockActive = {
        id: "s1",
        walletId: "w1",
        categoryId: "c1",
        type: "expense",
        amount: 100,
        title: "Subscription",
        startDate: "2026-10-01",
        frequency: "monthly",
        interval: 1,
        end: { type: "never" },
        status: "active",
        createdCount: 1,
        nextDueDate: "2026-11-01",
        canManage: true,
      };

      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: mockActive })
      );
      vi.stubGlobal("fetch", fetchMock);

      await updateSchedulerStatus("s1", { action: "resume" });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/schedulers/s1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ action: "resume" }),
        })
      );
    });
  });

  describe("deleteScheduler", () => {
    it("sends DELETE /api/v1/schedulers/:id", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ status: true, data: null })
      );
      vi.stubGlobal("fetch", fetchMock);

      await deleteScheduler("s1");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/schedulers/s1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("API Error Normalization (Step 1.3)", () => {
    it("maps 400/422 validation errors with field errors", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              status: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "One or more fields are invalid",
                fields: {
                  amount: "Must be greater than 0",
                  startDate: "End date must not be before start date",
                },
              },
            },
            false,
            400
          )
        )
      );

      await expect(
        createScheduler({
          walletId: "w1",
          type: "expense",
          amount: 0,
          startDate: "2026-11-01",
          frequency: "monthly",
          interval: 1,
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "One or more fields are invalid",
        fields: {
          amount: "Must be greater than 0",
          startDate: "End date must not be before start date",
          start_date: "End date must not be before start date",
        },
      });
    });

    it("maps 404 to clear not found message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              status: false,
              error: { code: "NOT_FOUND", message: "Scheduler not found" },
            },
            false,
            404
          )
        )
      );

      await expect(getScheduler("nonexistent")).rejects.toMatchObject({
        status: 404,
        message: "Recurring rule or wallet not found",
      });
    });

    it("maps 409 conflict to clear status transition / limit message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              status: false,
              error: { code: "CONFLICT", message: "Only active schedulers can be paused" },
            },
            false,
            409
          )
        )
      );

      await expect(updateSchedulerStatus("s1", { action: "pause" })).rejects.toMatchObject({
        status: 409,
        message: "Only active schedulers can be paused",
      });
    });
  });
});
