import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteApi, getApi, patchApi, postApi, putApi, ApiClientError } from "@/lib/api/client";
import { todayISODate } from "@/lib/utils";
import { WALLETS_QUERY_KEY } from "@/features/wallets/hooks/useWallets";
import { TRANSACTIONS_QUERY_KEY } from "@/features/transactions/hooks/useTransactions";
import type { IntervalUnit, EndConditionType } from "@/features/recurring/types";
import type { SchedulerResponse, SchedulerInput } from "@/shared/contracts/schedulers";

// --- Types & Interfaces ---

export type SchedulerStatus =
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type SchedulerFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "YEARLY";

export type SchedulerEndInput =
  | { type: "never" }
  | { type: "count"; count: number }
  | { type: "endDate"; endDate: string }
  | { type: "span"; value: number; unit: "weeks" | "months" | "years" };

export type SchedulerEndResponse =
  | { type: "never" }
  | { type: "count"; count: number }
  | { type: "endDate"; endDate: string };

export interface SchedulerRule {
  id: string;
  walletId: string;
  wallet_id: string;
  categoryId: string | null;
  category_id: string | null;
  type: "income" | "expense";
  amount: number;
  title: string;
  description?: string;
  note?: string;
  startDate: string;
  start_date: string;
  frequency: SchedulerFrequency;
  interval: number;
  intervalN: number;
  intervalUnit: IntervalUnit;
  anchorDay?: number;
  end: SchedulerEndResponse | SchedulerEndInput;
  endDate?: string;
  end_date?: string;
  endType?: EndConditionType;
  totalOccurrences?: number;
  status: SchedulerStatus;
  createdCount: number;
  postedCount: number;
  nextDueDate: string | null;
  nextRunDate: string;
  next_run_date: string | null;
  canManage: boolean;
  createdBy?: { name: string; avatarUrl?: string };
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  isShared?: boolean;
  authorName?: string;
  authorRole?: string;
}

export interface CreateSchedulerPayload {
  walletId?: string;
  wallet_id?: string;
  categoryId?: string | null;
  category_id?: string | null;
  type: "income" | "expense";
  amount: number;
  title?: string;
  description?: string;
  note?: string;
  startDate?: string;
  start_date?: string;
  frequency?: SchedulerFrequency;
  interval?: number;
  intervalN?: number;
  intervalUnit?: IntervalUnit;
  anchorDay?: number;
  end?: SchedulerEndInput;
  endDate?: string;
  end_date?: string;
  endType?: EndConditionType;
  totalOccurrences?: number;
}

export type UpdateSchedulerPayload = CreateSchedulerPayload;

export interface UpdateSchedulerStatusPayload {
  status?: SchedulerStatus;
  action?: "pause" | "resume";
}

export interface SchedulerListQuery {
  walletId?: string;
  wallet_id?: string;
  status?: SchedulerStatus;
}

export class SchedulerApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  code?: string;

  constructor(message: string, status: number, fields?: Record<string, string>, code?: string) {
    super(message);
    this.name = "SchedulerApiError";
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

// --- Query Keys ---

export const schedulerKeys = {
  all: ["schedulers"] as const,
  lists: () => [...schedulerKeys.all, "list"] as const,
  list: (params?: SchedulerListQuery) =>
    params && Object.keys(params).length > 0
      ? ([...schedulerKeys.lists(), params] as const)
      : schedulerKeys.lists(),
  details: () => [...schedulerKeys.all, "detail"] as const,
  detail: (id: string) => [...schedulerKeys.details(), id] as const,
};

// --- Helpers & Normalizers ---

export function isTodayLocalDate(dateString: string): boolean {
  if (!dateString) return false;
  const iso = dateString.split("T")[0];
  const today = todayISODate();
  return iso === today;
}

export function frequencyToIntervalUnit(freq: string): IntervalUnit {
  const f = freq.toLowerCase();
  switch (f) {
    case "daily":
      return "days";
    case "weekly":
      return "weeks";
    case "yearly":
      return "years";
    case "monthly":
    default:
      return "months";
  }
}

export function intervalUnitToFrequency(unit: IntervalUnit): "daily" | "weekly" | "monthly" | "yearly" {
  switch (unit) {
    case "days":
      return "daily";
    case "weeks":
      return "weekly";
    case "years":
      return "yearly";
    case "months":
    default:
      return "monthly";
  }
}

export function mapSchedulerResponseToRule(dto: SchedulerResponse): SchedulerRule {
  const intervalUnit = frequencyToIntervalUnit(dto.frequency);
  const endType: EndConditionType =
    dto.end.type === "count" ? "count" : dto.end.type === "endDate" ? "date" : "never";
  const endDate = dto.end.type === "endDate" ? dto.end.endDate : undefined;
  const totalOccurrences = dto.end.type === "count" ? dto.end.count : undefined;
  const startDay = parseInt(dto.startDate.split("-")[2] || "1", 10);
  const nextRun = dto.nextDueDate ?? dto.startDate;
  const now = new Date().toISOString();

  return {
    id: dto.id,
    walletId: dto.walletId,
    wallet_id: dto.walletId,
    categoryId: dto.categoryId ?? null,
    category_id: dto.categoryId ?? null,
    type: dto.type,
    amount: dto.amount,
    title: dto.title,
    description: dto.note ?? dto.title,
    note: dto.note,
    startDate: dto.startDate,
    start_date: dto.startDate,
    frequency: dto.frequency,
    interval: dto.interval,
    intervalN: dto.interval,
    intervalUnit,
    anchorDay: startDay,
    end: dto.end,
    endDate,
    end_date: endDate,
    endType,
    totalOccurrences,
    status: dto.status,
    createdCount: dto.createdCount,
    postedCount: dto.createdCount,
    nextDueDate: dto.nextDueDate,
    nextRunDate: nextRun,
    next_run_date: dto.nextDueDate,
    canManage: dto.canManage,
    createdBy: dto.createdBy,
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
    isShared: false,
    authorName: dto.createdBy?.name,
  };
}

export function normalizeSchedulerPayload(
  payload: CreateSchedulerPayload | UpdateSchedulerPayload
): SchedulerInput {
  const walletId = payload.walletId ?? payload.wallet_id;
  if (!walletId) {
    throw new SchedulerApiError("Wallet is required", 400, { walletId: "Target wallet is required", wallet_id: "Target wallet is required" });
  }

  const categoryId =
    payload.categoryId !== undefined
      ? (payload.categoryId ?? undefined)
      : (payload.category_id ?? undefined);

  const type = payload.type ?? "expense";
  const amount = payload.amount;
  const title = (payload.title ?? payload.description ?? "").trim() || "Recurring Transaction";
  const note = (payload.note ?? payload.description ?? "").trim() || undefined;
  const startDate = (payload.startDate ?? payload.start_date ?? todayISODate()).split("T")[0];

  let frequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly";
  if (payload.frequency) {
    frequency = payload.frequency.toLowerCase() as typeof frequency;
  } else if (payload.intervalUnit) {
    frequency = intervalUnitToFrequency(payload.intervalUnit);
  }

  const interval = payload.interval ?? payload.intervalN ?? 1;

  let end: SchedulerEndInput;
  if (payload.end) {
    end = payload.end;
  } else if (payload.endType === "count" && payload.totalOccurrences) {
    end = { type: "count", count: payload.totalOccurrences };
  } else if (
    (payload.endType === "date" || payload.endDate || payload.end_date) &&
    (payload.endDate || payload.end_date)
  ) {
    end = { type: "endDate", endDate: (payload.endDate ?? payload.end_date)!.split("T")[0] };
  } else {
    end = { type: "never" };
  }

  return {
    walletId,
    categoryId: categoryId || undefined,
    type,
    amount,
    title,
    note,
    startDate,
    frequency,
    interval,
    end,
  };
}

function normalizeErrorFields(fields?: Record<string, string>): Record<string, string> | undefined {
  if (!fields) return undefined;
  const normalized: Record<string, string> = { ...fields };
  for (const [key, msg] of Object.entries(fields)) {
    if (key === "walletId") normalized["wallet_id"] = msg;
    if (key === "wallet_id") normalized["walletId"] = msg;
    if (key === "categoryId") normalized["category_id"] = msg;
    if (key === "category_id") normalized["categoryId"] = msg;
    if (key === "startDate") normalized["start_date"] = msg;
    if (key === "start_date") normalized["startDate"] = msg;
    if (key === "end.endDate") {
      normalized["endDate"] = msg;
      normalized["end_date"] = msg;
    }
  }
  return normalized;
}

function handleApiError(error: unknown): never {
  if (error instanceof ApiClientError) {
    let msg = error.message;
    if (error.status === 404) {
      msg = "Recurring rule or wallet not found";
    } else if (error.status === 409) {
      msg = error.message || "Invalid status transition or scheduler limit reached";
    }
    throw new SchedulerApiError(msg, error.status, normalizeErrorFields(error.fields));
  }
  if (error instanceof Error) {
    throw new SchedulerApiError(error.message, 500);
  }
  throw new SchedulerApiError("Unknown scheduler error", 500);
}

// --- Client API Endpoint Functions ---

export async function getSchedulers(params?: SchedulerListQuery): Promise<SchedulerRule[]> {
  try {
    const searchParams = new URLSearchParams();
    const walletId = params?.walletId ?? params?.wallet_id;
    if (walletId) searchParams.set("walletId", walletId);
    if (params?.status) searchParams.set("status", String(params.status).toLowerCase());

    const query = searchParams.toString();
    const path = `/api/v1/schedulers${query ? `?${query}` : ""}`;
    const data = await getApi<SchedulerResponse[]>(path);
    return (data || []).map(mapSchedulerResponseToRule);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function getScheduler(id: string): Promise<SchedulerRule> {
  try {
    const data = await getApi<SchedulerResponse>(`/api/v1/schedulers/${id}`);
    return mapSchedulerResponseToRule(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function createScheduler(payload: CreateSchedulerPayload): Promise<SchedulerRule> {
  try {
    const body = normalizeSchedulerPayload(payload);
    const data = await postApi<SchedulerResponse>("/api/v1/schedulers", body);
    return mapSchedulerResponseToRule(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function updateScheduler(
  id: string,
  payload: UpdateSchedulerPayload
): Promise<SchedulerRule> {
  try {
    const body = normalizeSchedulerPayload(payload);
    const data = await putApi<SchedulerResponse>(`/api/v1/schedulers/${id}`, body);
    return mapSchedulerResponseToRule(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function updateSchedulerStatus(
  id: string,
  payload: UpdateSchedulerStatusPayload
): Promise<SchedulerRule> {
  try {
    let action: "pause" | "resume";
    if (payload.action) {
      action = payload.action;
    } else if (payload.status) {
      const s = String(payload.status).toLowerCase();
      action = s === "paused" || s === "pause" ? "pause" : "resume";
    } else {
      action = "pause";
    }

    const data = await patchApi<SchedulerResponse>(`/api/v1/schedulers/${id}/status`, { action });
    return mapSchedulerResponseToRule(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function deleteScheduler(id: string): Promise<void> {
  try {
    await deleteApi(`/api/v1/schedulers/${id}`);
  } catch (err) {
    return handleApiError(err);
  }
}

// --- Query and Mutation Hooks ---

export function useSchedulers(params?: SchedulerListQuery) {
  return useQuery({
    queryKey: schedulerKeys.list(params),
    queryFn: () => getSchedulers(params),
  });
}

export function useScheduler(id: string) {
  return useQuery({
    queryKey: schedulerKeys.detail(id),
    queryFn: () => getScheduler(id),
    enabled: Boolean(id),
  });
}

export function useCreateScheduler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSchedulerPayload) => createScheduler(payload),
    onSuccess: (created, variables) => {
      // Invalidate schedulers list
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });

      // Cross-module invalidation when start_date === today or occurrence executed immediately
      const startDate = variables.startDate ?? variables.start_date;
      const isImmediate =
        (startDate ? isTodayLocalDate(startDate) : false) || created.createdCount > 0;

      if (isImmediate) {
        queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["home-summary"] });
      }

      toast.success(`Recurring transaction "${created.title}" created successfully`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create recurring transaction");
    },
  });
}

export function useUpdateScheduler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSchedulerPayload }) =>
      updateScheduler(id, payload),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });

      const startDate = variables.payload.startDate ?? variables.payload.start_date;
      if (startDate && isTodayLocalDate(startDate)) {
        queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["home-summary"] });
      }

      toast.success(
        `Recurring rule "${updated.title}" updated. Changes apply to future occurrences.`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update recurring rule");
    },
  });
}

export function useUpdateSchedulerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSchedulerStatusPayload }) =>
      updateSchedulerStatus(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: schedulerKeys.all });

      const targetStatus: SchedulerStatus = payload.status
        ? (String(payload.status).toLowerCase() as SchedulerStatus)
        : payload.action === "pause"
        ? "paused"
        : "active";

      const previousQueries = queryClient.getQueriesData<SchedulerRule[]>({
        queryKey: schedulerKeys.all,
      });

      queryClient.setQueriesData<SchedulerRule[]>(
        { queryKey: schedulerKeys.all },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((item) =>
            item.id === id ? { ...item, status: targetStatus } : item
          );
        }
      );

      return { previousQueries };
    },
    onError: (error, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error instanceof Error ? error.message : "Failed to update rule status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
    },
  });
}

export function useDeleteScheduler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteScheduler(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: schedulerKeys.all });

      const previousQueries = queryClient.getQueriesData<SchedulerRule[]>({
        queryKey: schedulerKeys.all,
      });

      queryClient.setQueriesData<SchedulerRule[]>(
        { queryKey: schedulerKeys.all },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.filter((item) => item.id !== id);
        }
      );

      return { previousQueries };
    },
    onError: (error, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error instanceof Error ? error.message : "Failed to delete recurring rule");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
    },
  });
}
