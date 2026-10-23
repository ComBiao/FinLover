export type IntervalUnit = "days" | "weeks" | "months" | "years";

export type EndConditionType = "never" | "count" | "date";

export type RecurringRuleStatus = "active" | "paused" | "completed";

export type SharedWalletRole = "owner" | "contributor";

export interface RecurringRule {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  walletId: string;
  categoryId?: string | null;
  note?: string;

  /** Interval count, e.g. every 1, 2, 3... */
  intervalN: number;
  /** Cadence unit: days, weeks, months, years */
  intervalUnit: IntervalUnit;

  /**
   * Day of month anchor for month-based recurrence (e.g. 31 for Jan 31).
   * Used to restore the 31st after clamping to Feb 28/29.
   */
  anchorDay?: number;

  /** First scheduled date in ISO format (YYYY-MM-DD) */
  startDate: string;
  /** Next scheduled execution date in ISO format (YYYY-MM-DD) */
  nextRunDate: string;
  /** Last date an occurrence was executed, if any */
  lastRunDate?: string | null;

  /** End condition type: 'never' | 'count' | 'date' */
  endType: EndConditionType;
  /** Maximum total occurrences if endType === 'count' */
  totalOccurrences?: number;
  /** Number of occurrences posted so far */
  postedCount: number;
  /** End cutoff date (YYYY-MM-DD) if endType === 'date' */
  endDate?: string;

  /** Lifecycle status: active, paused, or completed */
  status: RecurringRuleStatus;

  /** Shared wallet support (US7-6) */
  isShared?: boolean;
  authorName?: string;
  authorRole?: SharedWalletRole;

  createdAt: string;
  updatedAt: string;
}

export interface SimulationLogEntry {
  id: string;
  timestamp: string;
  simulatedDate: string;
  ruleId: string;
  ruleTitle: string;
  transactionId?: string;
  amount: number;
  type: "income" | "expense";
  walletName: string;
  occurrenceNumber: number;
  action: "posted" | "resumed" | "paused" | "completed" | "skipped";
  message: string;
}

