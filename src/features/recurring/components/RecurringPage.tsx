"use client";

import { useMemo, useState } from "react";
import { Layers, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { useCurrentUser, displayName } from "@/features/auth/hooks/useCurrentUser";
import { todayISODate } from "@/lib/utils";
import type { RecurringRule } from "@/features/recurring/types";
import {
  useCreateScheduler,
  useDeleteScheduler,
  useSchedulers,
  useUpdateScheduler,
  useUpdateSchedulerStatus,
  type CreateSchedulerPayload,
  type SchedulerRule,
  type UpdateSchedulerPayload,
} from "@/features/recurring/api/schedulers";
import { CreateRuleModal } from "@/features/recurring/components/CreateRuleModal";
import { EditRuleModal } from "@/features/recurring/components/EditRuleModal";
import { RulesTable } from "@/features/recurring/components/RulesTable";

export function RecurringPage() {
  const { data: rawRules, isLoading, isError, error, refetch } = useSchedulers();
  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const { data: currentUser } = useCurrentUser();

  const createMutation = useCreateScheduler();
  const updateMutation = useUpdateScheduler();
  const statusMutation = useUpdateSchedulerStatus();
  const deleteMutation = useDeleteScheduler();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SchedulerRule | null>(null);

  const rules = useMemo(() => (rawRules ?? []) as unknown as RecurringRule[], [rawRules]);
  const authorAttribution = displayName(currentUser);
  const simulatedDate = todayISODate();

  const handleCreateRule = async (
    ruleInput: Omit<RecurringRule, "id" | "createdAt" | "updatedAt" | "postedCount">
  ) => {
    await createMutation.mutateAsync(ruleInput as unknown as CreateSchedulerPayload);
  };

  const handleSaveEditRule = async (ruleId: string, updates: Partial<RecurringRule>) => {
    await updateMutation.mutateAsync({
      id: ruleId,
      payload: updates as unknown as UpdateSchedulerPayload,
    });
  };

  const handlePause = (ruleId: string) => {
    statusMutation.mutate({ id: ruleId, payload: { action: "pause", status: "paused" } });
  };

  const handleResume = (ruleId: string) => {
    statusMutation.mutate({ id: ruleId, payload: { action: "resume", status: "active" } });
  };

  const handleDelete = (ruleId: string) => {
    deleteMutation.mutate(ruleId);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Recurring Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Automate subscriptions, recurring bills, and regular income.
            </p>
          </div>

          {!isLoading && !isError && rules.length > 0 && (
            <Button onClick={() => setCreateModalOpen(true)} className="font-semibold">
              <Plus className="mr-1.5 size-4" />
              Create Recurring Transaction
            </Button>
          )}
        </div>

        {/* Content Section */}
        {isLoading ? (
          /* Loading State: Render Skeleton rows/cards (US4-3) */
          <div className="space-y-4" data-testid="loading-state" aria-busy="true">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-9 w-36" />
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ) : isError ? (
          /* Error State: Display error banner with Retry button */
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-xs"
            data-testid="error-state"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-destructive">Failed to load recurring transactions</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {error instanceof Error ? error.message : "An error occurred while fetching your schedules."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-1 font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        ) : (
          /* Populated or Empty State */
          <div className="space-y-3">
            {rules.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Active Schedules & Rules</h2>
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    ({rules.length} schedule{rules.length !== 1 ? "s" : ""} configured)
                  </span>
                </div>
              </div>
            )}

            <RulesTable
              rules={rules}
              wallets={wallets}
              categories={categories}
              simulatedDate={simulatedDate}
              onPause={handlePause}
              onResume={handleResume}
              onEdit={(rule) => setEditingRule(rule as unknown as SchedulerRule)}
              onDelete={handleDelete}
              onOpenCreateModal={() => setCreateModalOpen(true)}
              pendingStatusId={statusMutation.isPending ? (statusMutation.variables?.id ?? null) : null}
            />
          </div>
        )}

        {/* Create Rule Modal */}
        <CreateRuleModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          wallets={wallets}
          categories={categories}
          authorAttribution={authorAttribution}
          onCreateRule={handleCreateRule}
        />

        {/* Edit Rule Modal */}
        <EditRuleModal
          rule={editingRule as unknown as RecurringRule}
          open={Boolean(editingRule)}
          onOpenChange={(open) => !open && setEditingRule(null)}
          wallets={wallets}
          categories={categories}
          onSave={handleSaveEditRule}
        />
      </div>
    </main>
  );
}
