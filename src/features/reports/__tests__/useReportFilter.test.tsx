// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FILTER_APPLY_DELAY_MS, useReportFilter } from "@/features/reports/hooks/useReportFilter";

const WALLETS = [{ id: "w1" }, { id: "w2" }];

describe("useReportFilter (US8-1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday 21 Oct 2026, local noon
    vi.setSystemTime(new Date(2026, 9, 21, 12));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts with every wallet and the current month, applied straight away", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));

    expect(result.current.preset).toBe("monthly");
    expect(result.current.isValid).toBe(true);
    expect(result.current.isModified).toBe(false);
    expect(result.current.applied).toEqual({
      walletIds: ["w1", "w2"],
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
  });

  it("applies nothing until there is a wallet to query", () => {
    const { result, rerender } = renderHook(({ wallets }) => useReportFilter(wallets), {
      initialProps: { wallets: [] as { id: string }[] },
    });

    expect(result.current.applied).toBeNull();
    expect(result.current.errors.walletIds).toBe("Select at least 1 wallet");

    rerender({ wallets: WALLETS });
    expect(result.current.applied?.walletIds).toEqual(["w1", "w2"]);
  });

  it("jumps to the current week, month or year when a preset is picked, and steps with shift", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));

    act(() => result.current.setPreset("weekly"));
    expect(result.current.range).toEqual({ startDate: "2026-10-19", endDate: "2026-10-25" });

    act(() => result.current.shift(-1));
    expect(result.current.range).toEqual({ startDate: "2026-10-12", endDate: "2026-10-18" });

    act(() => result.current.setPreset("annual"));
    expect(result.current.range).toEqual({ startDate: "2026-01-01", endDate: "2026-12-31" });

    act(() => result.current.shift(1));
    expect(result.current.range).toEqual({ startDate: "2027-01-01", endDate: "2027-12-31" });
  });

  it("re-applies only after the filter has been still for the debounce delay", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));

    act(() => result.current.shift(-1));
    expect(result.current.applied?.startDate).toBe("2026-10-01");

    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS - 1));
    expect(result.current.applied?.startDate).toBe("2026-10-01");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.applied).toMatchObject({ startDate: "2026-09-01", endDate: "2026-09-30" });
  });

  it("keeps the last applied filter when the end date falls before the start date", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));
    act(() => result.current.setPreset("custom"));
    act(() => result.current.setStartDate("2026-09-30"));
    act(() => result.current.setEndDate("2026-09-01"));
    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS * 2));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.endDate).toBe("End date must be on or after the start date");
    // still the first (default month) filter — nothing new was applied
    expect(result.current.applied).toMatchObject({ startDate: "2026-10-01", endDate: "2026-10-31" });
    // and it is still labelled as the monthly filter it was applied as
    expect(result.current.appliedPreset).toBe("monthly");

    act(() => result.current.setEndDate("2026-10-05"));
    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS));
    expect(result.current.applied).toMatchObject({ startDate: "2026-09-30", endDate: "2026-10-05" });
    expect(result.current.appliedPreset).toBe("custom");
  });

  it("does not apply when every wallet is unchecked, and select-all brings them back", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));

    act(() => result.current.setWalletIds([]));
    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS * 2));
    expect(result.current.errors.walletIds).toBe("Select at least 1 wallet");
    expect(result.current.applied?.walletIds).toEqual(["w1", "w2"]);

    act(() => result.current.setWalletIds(["w2"]));
    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS));
    expect(result.current.applied?.walletIds).toEqual(["w2"]);
    expect(result.current.isModified).toBe(true);

    act(() => result.current.selectAllWallets());
    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS));
    expect(result.current.applied?.walletIds).toEqual(["w1", "w2"]);
  });

  it("drops a selected wallet that no longer exists", () => {
    const { result, rerender } = renderHook(({ wallets }) => useReportFilter(wallets), {
      initialProps: { wallets: WALLETS },
    });
    act(() => result.current.setWalletIds(["w1", "w2"]));

    rerender({ wallets: [{ id: "w2" }] });
    expect(result.current.walletIds).toEqual(["w2"]);
  });

  it("reset returns to every wallet and the current month", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));
    act(() => result.current.setPreset("weekly"));
    act(() => result.current.setWalletIds(["w1"]));
    expect(result.current.isModified).toBe(true);

    act(() => result.current.reset());
    act(() => vi.advanceTimersByTime(FILTER_APPLY_DELAY_MS));

    expect(result.current.isModified).toBe(false);
    expect(result.current.applied).toEqual({
      walletIds: ["w1", "w2"],
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
  });

  it("ignores shift on a custom range", () => {
    const { result } = renderHook(() => useReportFilter(WALLETS));
    act(() => result.current.setPreset("custom"));
    const before = result.current.range;
    act(() => result.current.shift(1));
    expect(result.current.range).toEqual(before);
  });
});
