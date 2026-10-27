import { AlertCircle, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** Loading placeholder shared by every report section. */
export function ReportSkeleton({ className, lines = 4 }: { className?: string; lines?: number }) {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn("h-5", index === 0 ? "w-1/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Empty state: the request worked, there is just nothing in the period. */
export function ReportEmpty({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-10 text-center", className)}>
      <BarChart3 className="size-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/** Error state with a retry button. */
export function ReportError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 py-10 text-center", className)}>
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/** The server's message for an API failure, otherwise a generic one. */
export function errorMessageOf(error: unknown) {
  return error instanceof ApiClientError && error.message ? error.message : "Something went wrong. Please try again.";
}
