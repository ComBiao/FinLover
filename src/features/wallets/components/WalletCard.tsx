"use client";

import * as React from "react";
import { Check, Edit2, MoreVertical, PiggyBank, Target, Trash2, Wallet as WalletIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { hexToRgba, shadeHex } from "@/components/chipColor";
import { cn, formatBaht } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";
import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { useBalanceVisibility } from "@/features/wallets/store/useBalanceVisibility";

type WalletCardProps = {
  wallet: Wallet;
  onEdit: (wallet: Wallet) => void;
  onEditSaving: (wallet: Wallet) => void;
  onDelete: (wallet: Wallet) => void;
};

export function WalletCard({ wallet, onEdit, onEditSaving, onDelete }: WalletCardProps) {
  const activeWalletId = useActiveWallet((state) => state.activeWalletId);
  const setActiveWalletId = useActiveWallet((state) => state.setActiveWalletId);
  const isVisible = useBalanceVisibility((state) => state.isVisible);

  const isActive = activeWalletId === wallet.id;
  const color = wallet.color ?? "#4A4757";
  const Icon = wallet.isSaving ? PiggyBank : wallet.icon ?? WalletIcon;

  const goal = wallet.savingGoal ?? wallet.goalAmount ?? 0;
  const isSaving = Boolean(wallet.isSaving && goal > 0);
  const percent = isSaving
    ? Math.max(0, Math.min(100, Math.floor((wallet.balance / goal) * 100)))
    : 0;
  const reached = isSaving && wallet.balance >= goal;
  const remaining = isSaving ? Math.max(0, goal - wallet.balance) : 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-md",
        isActive ? "ring-2 ring-primary ring-offset-2" : ""
      )}
      style={{
        borderColor: isActive ? color : hexToRgba(color, 0.3),
        backgroundColor: hexToRgba(color, 0.04),
      }}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-bold text-foreground text-lg">{wallet.name}</h3>
                {wallet.isDefault ? (
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Default
                  </Badge>
                ) : null}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {wallet.isSaving ? "Saving Wallet" : "Daily Wallet"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isActive ? (
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold">
                Active
              </Badge>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setActiveWalletId(wallet.id)}
              >
                Set Active
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon-sm" className="size-8">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Wallet actions</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveWalletId(wallet.id)}>
                  <Check className="mr-2 size-4" />
                  Select as Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(wallet)}>
                  <Edit2 className="mr-2 size-4" />
                  Edit Name & Color
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditSaving(wallet)}>
                  <Target className="mr-2 size-4" />
                  Saving Goal Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onDelete(wallet)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Wallet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Balance Section */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Balance
          </span>
          <div
            className="text-2xl font-extrabold sm:text-3xl"
            style={{ color: shadeHex(color, 0.4) }}
          >
            {isVisible ? formatBaht(wallet.balance) : "••••••"}
          </div>
        </div>

        {/* Saving Goal Progress Section */}
        {isSaving ? (
          <div className="mt-auto flex flex-col gap-2 rounded-xl border border-border/50 bg-card/60 p-3 pt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-foreground">Goal: {isVisible ? formatBaht(goal) : "••••••"}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {reached
                  ? "Goal reached! 🎉"
                  : isVisible
                    ? `${formatBaht(remaining)} left`
                    : "••••••"}
              </span>
            </div>
            <Progress value={percent} className="h-2" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{percent}% saved</span>
              <span>{isVisible ? formatBaht(wallet.balance) : "••••••"}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
