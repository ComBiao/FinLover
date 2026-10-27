import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ReportEmpty,
  ReportError,
  ReportSkeleton,
  errorMessageOf,
} from "@/features/reports/components/ReportStates";
import { cn } from "@/lib/utils";

/** The slice of a TanStack Query result a section needs. */
export type ReportQuery<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  isPlaceholderData?: boolean;
  error: unknown;
  refetch: () => unknown;
};

type ReportSectionProps<T> = {
  title: string;
  description?: string;
  /** Controls shown on the right of the header (for example an interval toggle). */
  action?: ReactNode;
  query: ReportQuery<T>;
  /** When true for the loaded data, `emptyMessage` replaces the content. */
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  /** Overrides the text shown for an error (for example a friendlier message for one status). */
  errorMessage?: (error: unknown) => string;
  children: (data: T) => ReactNode;
};

/**
 * A card with a title that renders one of loading (skeleton), error (retry),
 * empty or the real content: the same states for every report section.
 * While a new filter loads, the previous data stays visible, dimmed.
 */
export function ReportSection<T>({
  title,
  description,
  action,
  query,
  isEmpty,
  emptyMessage = "No transactions recorded in this period",
  errorMessage = errorMessageOf,
  children,
}: ReportSectionProps<T>) {
  const { data } = query;

  let body: ReactNode;
  if (data === undefined && query.isPending) {
    body = <ReportSkeleton lines={5} />;
  } else if (data === undefined) {
    body = <ReportError message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  } else if (isEmpty?.(data)) {
    body = <ReportEmpty message={emptyMessage} />;
  } else {
    body = (
      <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>{children(data)}</div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
