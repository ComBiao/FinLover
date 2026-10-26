"use client";

import { useState } from "react";
import {
  Calendar,
  FastForward,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, todayISODate } from "@/lib/utils";
import type { SimulationLogEntry } from "../types";

type TimeSimulationPanelProps = {
  simulatedDate: string;
  onSetSimulatedDate: (date: string) => void;
  onSimulateDueRun: () => Promise<unknown>;
  onFastForward: (amount: number, unit: "days" | "weeks" | "months" | "years") => Promise<unknown>;
  onResetTestData: () => void;
  logs: SimulationLogEntry[];
  onClearLogs: () => void;
  dueRulesCount: number;
  totalActiveRulesCount: number;
};

export function TimeSimulationPanel({
  simulatedDate,
  onSetSimulatedDate,
  onSimulateDueRun,
  onFastForward,
  onResetTestData,
  logs,
  onClearLogs,
  dueRulesCount,
  totalActiveRulesCount,
}: TimeSimulationPanelProps) {
  const [customDate, setCustomDate] = useState(simulatedDate);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  const realToday = todayISODate();
  const isTimeShifted = simulatedDate !== realToday;

  const handleSimulateDueRun = async () => {
    setIsProcessing(true);
    try {
      await onSimulateDueRun();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFastForward = async (amount: number, unit: "days" | "weeks" | "months" | "years") => {
    setIsProcessing(true);
    try {
      await onFastForward(amount, unit);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    setIsProcessing(true);
    try {
      onSetSimulatedDate(customDate);
      await onSimulateDueRun();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Timer className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Time Simulation & Catch-Up Engine
              </CardTitle>
              <CardDescription className="text-xs">
                Simulate asynchronous crons, fast-forward calendar time, and verify ledger catch-up.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetTestData}
              disabled={isProcessing}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset Test Data
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status bar */}
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Calendar className="size-5 text-primary" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Simulated Clock Date</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {simulatedDate}
                </span>
                {isTimeShifted ? (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-600">
                    +Time Shifted
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Today
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="size-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Scheduler Status</p>
              <p className="text-sm font-semibold text-foreground">
                {dueRulesCount > 0 ? (
                  <span className="text-primary font-bold">{dueRulesCount} rule{dueRulesCount > 1 ? "s" : ""} due to run</span>
                ) : (
                  <span className="text-muted-foreground">All {totalActiveRulesCount} active rules up to date</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={handleSimulateDueRun}
              disabled={isProcessing}
              className={cn(
                "w-full sm:w-auto font-semibold shadow-sm transition-all",
                dueRulesCount > 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse"
                  : "bg-primary/80 text-primary-foreground hover:bg-primary"
              )}
            >
              <Play className="mr-2 size-4 fill-current" />
              Simulate Today&apos;s Due Run
              {dueRulesCount > 0 && (
                <span className="ml-2 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs">
                  {dueRulesCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Fast-Forward Controls */}
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FastForward className="size-3.5 text-primary" />
              Fast-Forward Time & Execute Catch-Up
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Advances the calendar and automatically posts all due cycles into the ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleFastForward(1, "days")}
              className="h-8 text-xs font-medium"
            >
              +1 Day
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleFastForward(1, "weeks")}
              className="h-8 text-xs font-medium"
            >
              +1 Week
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleFastForward(1, "months")}
              className="h-8 text-xs font-medium"
            >
              +1 Month
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleFastForward(3, "months")}
              className="h-8 text-xs font-medium"
            >
              +3 Months
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleFastForward(6, "months")}
              className="h-8 text-xs font-medium"
            >
              +6 Months
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleFastForward(1, "years")}
              className="h-8 text-xs font-medium"
            >
              +1 Year
            </Button>
          </div>
        </div>

        {/* Custom Date Jump Form */}
        <form onSubmit={handleCustomDateSubmit} className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-muted-foreground">Jump to specific target date:</span>
          <Input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            disabled={isProcessing}
            className="h-8 w-40 text-xs font-mono"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={isProcessing || !customDate || customDate === simulatedDate}
            className="h-8 text-xs"
          >
            Catch-up to Date
          </Button>
          {isTimeShifted && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomDate(realToday);
                onSetSimulatedDate(realToday);
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset to Actual Today
            </Button>
          )}
        </form>

        {/* Execution Log */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => setShowLogs((s) => !s)}
              className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              <Sparkles className="size-3.5 text-primary" />
              <span>Simulation Activity Log ({logs.length})</span>
              {showLogs ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
            </button>

            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearLogs}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 size-3" />
                Clear Log
              </Button>
            )}
          </div>

          {showLogs && (
            <div className="max-h-48 overflow-y-auto p-2 text-xs">
              {logs.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  No simulation activity recorded yet. Click &quot;Simulate Today&apos;s Due Run&quot; or fast-forward to trigger rules.
                </div>
              ) : (
                <div className="space-y-1.5 font-mono">
                  {logs.map((log) => {
                    const isPosted = log.action === "posted";
                    const isResumed = log.action === "resumed";
                    const isPaused = log.action === "paused";
                    const isCompleted = log.action === "completed";

                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "flex items-start justify-between gap-2 rounded px-2.5 py-1.5 border text-[11px]",
                          isPosted && "border-primary/20 bg-primary/5 text-foreground",
                          isResumed && "border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-100",
                          isPaused && "border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-100",
                          isCompleted && "border-purple-500/20 bg-purple-500/5 text-purple-900 dark:text-purple-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">[{log.timestamp}]</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1 py-0 uppercase font-semibold",
                              isPosted && "border-primary/40 text-primary",
                              isResumed && "border-blue-500/40 text-blue-600",
                              isPaused && "border-amber-500/40 text-amber-600",
                              isCompleted && "border-purple-500/40 text-purple-600"
                            )}
                          >
                            {log.action}
                          </Badge>
                          <span className="font-sans">{log.message}</span>
                        </div>
                        <span className="shrink-0 text-muted-foreground">Date: {log.simulatedDate}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

