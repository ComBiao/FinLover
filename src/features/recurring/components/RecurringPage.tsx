"use client";

import { useMemo, useState } from "react";
import {
  Layers,
  Plus,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecurringEngine } from "../hooks/useRecurringEngine";
import type { RecurringRule } from "../types";
import { CreateRuleModal } from "./CreateRuleModal";
import { EditRuleModal } from "./EditRuleModal";
import { RulesTable } from "./RulesTable";
import { TimeSimulationPanel } from "./TimeSimulationPanel";

export function RecurringPage() {
  const {
    rules,
    simulatedDate,
    logs,
    authorAttribution,
    wallets,
    categories,
    setSimulatedDate,
    addRule,
    updateRule,
    deleteRule,
    pauseRule,
    resumeRule,
    processDueRules,
    fastForwardTime,
    clearLogs,
    resetTestData,
  } = useRecurringEngine();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [showSimulator, setShowSimulator] = useState(true);

  // Calculate due rules for badge
  const dueRulesCount = useMemo(() => {
    return rules.filter((r) => r.status === "active" && r.nextRunDate <= simulatedDate).length;
  }, [rules, simulatedDate]);

  const totalActiveRulesCount = useMemo(() => {
    return rules.filter((r) => r.status === "active").length;
  }, [rules]);

  // Handle creating a new rule
  const handleCreateRule = (
    ruleInput: Omit<RecurringRule, "id" | "createdAt" | "updatedAt" | "postedCount">
  ) => {
    const createdRule = addRule(ruleInput);
    toast.success(`Recurring rule "${createdRule.title}" created successfully`);
  };

  // Handle editing a rule (future-only)
  const handleSaveEditRule = (ruleId: string, updates: Partial<RecurringRule>) => {
    updateRule(ruleId, updates);
    toast.success("Recurring rule updated. Changes apply to future occurrences.");
  };

  // Handle deleting a rule
  const handleDeleteRule = (ruleId: string) => {
    deleteRule(ruleId);
    toast.success("Recurring rule deleted. Past transactions in wallet ledger are preserved.");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                Recurring Transactions
              </h1>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs">
                EPIC 4
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Automate subscriptions, recurring bills, and regular income.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator((s) => !s)}
              className="text-xs"
            >
              <Timer className="mr-1.5 size-3.5 text-primary" />
              {showSimulator ? "Hide Simulation Deck" : "Show Simulation Deck"}
            </Button>
          </div>
        </div>

        {/* Section A: Simulation & Fast-Forward Engine */}
        {showSimulator && (
          <TimeSimulationPanel
            simulatedDate={simulatedDate}
            onSetSimulatedDate={setSimulatedDate}
            onSimulateDueRun={() => processDueRules(simulatedDate)}
            onFastForward={(amt, unit) => fastForwardTime(amt, unit, true)}
            onResetTestData={resetTestData}
            logs={logs}
            onClearLogs={clearLogs}
            dueRulesCount={dueRulesCount}
            totalActiveRulesCount={totalActiveRulesCount}
          />
        )}

        {/* Section C: Live Unified Rules Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Active Schedules & Rules</h2>
              <span className="text-xs text-muted-foreground sm:text-sm">
                ({rules.length} schedule{rules.length !== 1 ? "s" : ""} configured)
              </span>
            </div>

            <Button onClick={() => setCreateModalOpen(true)} className="font-semibold">
              <Plus className="mr-1.5 size-4" />
              Create Recurring Transaction
            </Button>
          </div>

          <RulesTable
            rules={rules}
            wallets={wallets}
            categories={categories}
            simulatedDate={simulatedDate}
            onPause={pauseRule}
            onResume={resumeRule}
            onEdit={(rule) => setEditingRule(rule)}
            onDelete={handleDeleteRule}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        </div>

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
          rule={editingRule}
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
