import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultRange,
  presetRange,
  shiftPresetRange,
  todayISO,
  validateReportFilter,
  type DateRangeStrings,
  type FilterErrors,
  type PeriodPreset,
  type ReportPreset,
} from "@/features/reports/period";
import type { ReportFilter } from "@/features/reports/types";

/** How long the filter must sit still before the sections re-fetch. */
export const FILTER_APPLY_DELAY_MS = 300;

export type ReportFilterWallet = { id: string };

export type ReportFilterState = {
  preset: ReportPreset;
  range: DateRangeStrings;
  /** Selected wallets, limited to wallets that still exist. */
  walletIds: string[];
  errors: FilterErrors;
  isValid: boolean;
  /** The last valid filter (debounced); `null` until the first one. The sections query with this. */
  applied: ReportFilter | null;
  setPreset: (preset: ReportPreset) => void;
  shift: (direction: 1 | -1) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setWalletIds: (ids: string[]) => void;
  selectAllWallets: () => void;
  reset: () => void;
  /** True when the draft differs from the defaults (all wallets, this month). */
  isModified: boolean;
};

/**
 * Report filter state (US8-1): wallets + period, validated as the user edits.
 *
 * Wallets default to "all" until the user picks, so wallets loaded later or
 * created afterwards are included. A filter is applied on its own — debounced,
 * the first one immediately — but only while it is valid; an invalid draft
 * leaves the last applied filter (and the data on screen) untouched.
 */
export function useReportFilter(wallets: ReportFilterWallet[]): ReportFilterState {
  const [preset, setPresetState] = useState<ReportPreset>("monthly");
  const [range, setRange] = useState<DateRangeStrings>(() => defaultRange());
  const [selected, setSelected] = useState<string[] | null>(null);

  const allIds = useMemo(() => wallets.map((wallet) => wallet.id), [wallets]);
  const allKey = allIds.join(",");
  const walletIds = useMemo(
    () => (selected === null ? allIds : selected.filter((id) => allIds.includes(id))),
    // allKey stands in for allIds so a refetch that returns the same wallets doesn't churn the filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, allKey]
  );

  const errors = useMemo(
    () => validateReportFilter({ walletIds, ...range }),
    [walletIds, range]
  );
  const isValid = Object.keys(errors).length === 0;

  const draft = useMemo<ReportFilter>(
    () => ({ walletIds, startDate: range.startDate, endDate: range.endDate }),
    [walletIds, range.startDate, range.endDate]
  );

  const [applied, setApplied] = useState<ReportFilter | null>(null);
  const hasApplied = useRef(false);
  useEffect(() => {
    if (!isValid) return;
    if (!hasApplied.current) {
      hasApplied.current = true;
      setApplied(draft);
      return;
    }
    const timer = setTimeout(() => setApplied(draft), FILTER_APPLY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, isValid]);

  const setPreset = useCallback((next: ReportPreset) => {
    setPresetState(next);
    // Presets jump to the current week / month / year; Custom keeps the dates on screen to edit.
    if (next !== "custom") setRange(presetRange(next, todayISO()));
  }, []);

  const shift = useCallback(
    (direction: 1 | -1) => {
      if (preset === "custom") return;
      setRange((current) => shiftPresetRange(preset as PeriodPreset, current, direction));
    },
    [preset]
  );

  const setStartDate = useCallback((value: string) => setRange((current) => ({ ...current, startDate: value })), []);
  const setEndDate = useCallback((value: string) => setRange((current) => ({ ...current, endDate: value })), []);
  const setWalletIds = useCallback((ids: string[]) => setSelected(ids), []);
  const selectAllWallets = useCallback(() => setSelected(null), []);
  const reset = useCallback(() => {
    setPresetState("monthly");
    setRange(defaultRange());
    setSelected(null);
  }, []);

  const defaults = defaultRange();
  const isModified =
    selected !== null ||
    preset !== "monthly" ||
    range.startDate !== defaults.startDate ||
    range.endDate !== defaults.endDate;

  return {
    preset,
    range,
    walletIds,
    errors,
    isValid,
    applied,
    setPreset,
    shift,
    setStartDate,
    setEndDate,
    setWalletIds,
    selectAllWallets,
    reset,
    isModified,
  };
}
