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

export type ReportFilterWallet = { id: string; isShared?: boolean };

export type ReportFilterState = {
  preset: ReportPreset;
  range: DateRangeStrings;
  /** Selected wallets, limited to wallets that still exist. Until the user picks, every personal wallet. */
  walletIds: string[];
  errors: FilterErrors;
  isValid: boolean;
  /** The last valid filter (debounced); `null` until the first one. The sections query with this. */
  applied: ReportFilter | null;
  /** The period preset that was chosen when `applied` was applied (for labelling it). */
  appliedPreset: ReportPreset;
  setPreset: (preset: ReportPreset) => void;
  shift: (direction: 1 | -1) => void;
  /** Replace both dates at once (the Custom range picker). */
  setRange: (range: DateRangeStrings) => void;
  /** Move a Weekly / Monthly / Annual period to the one containing this `YYYY-MM-DD` day. */
  jumpTo: (anchor: string) => void;
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
  const personalIds = useMemo(() => wallets.filter((wallet) => !wallet.isShared).map((wallet) => wallet.id), [wallets]);
  const allKey = allIds.join(",");
  const personalKey = personalIds.join(",");
  const hasShared = personalIds.length !== allIds.length;
  const walletIds = useMemo(
    // Shared wallets are opt-in, like on Home and Transactions; with no personal wallet at all the shared ones stand in.
    () => (selected === null ? (personalIds.length > 0 ? personalIds : allIds) : selected.filter((id) => allIds.includes(id))),
    // the keys stand in for the arrays so a refetch that returns the same wallets doesn't churn the filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, allKey, personalKey]
  );

  const errors = useMemo(
    () => validateReportFilter({ walletIds }),
    [walletIds]
  );
  const isValid = Object.keys(errors).length === 0;

  const draft = useMemo<ReportFilter>(
    () => ({ walletIds, startDate: range.startDate, endDate: range.endDate }),
    [walletIds, range.startDate, range.endDate]
  );

  const [applied, setApplied] = useState<ReportFilter | null>(null);
  const [appliedPreset, setAppliedPreset] = useState<ReportPreset>("monthly");
  const hasApplied = useRef(false);
  useEffect(() => {
    if (!isValid) return;
    const apply = () => {
      setApplied(draft);
      setAppliedPreset(preset);
    };
    if (!hasApplied.current) {
      hasApplied.current = true;
      apply();
      return;
    }
    const timer = setTimeout(apply, FILTER_APPLY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, preset, isValid]);

  const setPreset = useCallback((next: ReportPreset) => {
    setPresetState(next);
    // Presets jump to the current week / month / year; Custom keeps the dates on screen to adjust.
    if (next !== "custom") setRange(presetRange(next, todayISO()));
  }, []);

  const shift = useCallback(
    (direction: 1 | -1) => {
      if (preset === "custom") return;
      setRange((current) => shiftPresetRange(preset as PeriodPreset, current, direction));
    },
    [preset]
  );

  const replaceRange = useCallback((next: DateRangeStrings) => setRange(next), []);
  const jumpTo = useCallback(
    (anchor: string) => {
      if (preset !== "custom") setRange(presetRange(preset as PeriodPreset, anchor));
    },
    [preset]
  );
  const setWalletIds = useCallback((ids: string[]) => setSelected(ids), []);
  // Select all means every wallet, shared ones included; without shared wallets that is just the default.
  const selectAllWallets = useCallback(
    () => setSelected(hasShared ? allIds : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasShared, allKey]
  );
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
    appliedPreset,
    setPreset,
    shift,
    setRange: replaceRange,
    jumpTo,
    setWalletIds,
    selectAllWallets,
    reset,
    isModified,
  };
}
