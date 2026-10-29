"use client";

import * as React from "react";
import Link from "next/link";
import {
  Edit2,
  LogOut,
  MoreVertical,
  PiggyBank,
  Target,
  Trash2,
  Users,
  Wallet as WalletIcon,
} from "lucide-react";

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
import { MemberAvatar } from "@/features/wallets/shared/MemberAvatar";
import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { GoalReachedCelebration } from "./GoalReachedCelebration";

type WalletCardProps = {
  wallet: Wallet;
  onEdit: (wallet: Wallet) => void;
  onEditSaving: (wallet: Wallet) => void;
  onDelete: (wallet: Wallet) => void;
  /** Shared wallets: open the Members dialog. */
  onOpenMembers?: (wallet: Wallet) => void;
  /** Shared wallets (Contributor): leave the wallet. */
  onLeave?: (wallet: Wallet) => void;
};

export function WalletCard({
  wallet,
  onEdit,
  onEditSaving,
  onDelete,
  onOpenMembers,
  onLeave,
}: WalletCardProps) {
  const setActiveWalletId = useActiveWallet((state) => state.setActiveWalletId);

  const isShared = Boolean(wallet.isShared);
  const isOwner = wallet.role === "owner";
  const color = wallet.color ?? "#4A4757";
  const Icon = wallet.icon ?? (wallet.isSaving ? PiggyBank : WalletIcon);

  const goal = wallet.savingGoal ?? wallet.goalAmount ?? 0;
  const isSaving = Boolean(wallet.isSaving && goal > 0);
  const percent = isSaving
    ? Math.max(0, Math.min(100, Math.floor((wallet.balance / goal) * 100)))
    : 0;
  const reached = isSaving && wallet.balance >= goal;
  const remaining = isSaving ? Math.max(0, goal - wallet.balance) : 0;

  const members = wallet.members ?? [];
  const memberCount = wallet.memberCount ?? members.length;

  const title = (
    <h3 className="truncate font-bold text-foreground text-lg">{wallet.name}</h3>
  );

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-md",
        reached && "border-emerald-500/40 shadow-sm shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/15"
      )}
      style={{
        borderColor: reached ? hexToRgba(color, 0.45) : hexToRgba(color, 0.3),
        backgroundColor: reached ? undefined : hexToRgba(color, 0.04),
        ...(reached
          ? {
              background: `linear-gradient(135deg, ${hexToRgba(color, 0.12)} 0%, ${hexToRgba(color, 0.04)} 45%, rgba(16, 185, 129, 0.12) 100%)`,
            }
          : {}),
      }}
    >
      {reached ? <GoalReachedCelebration /> : null}
      <CardContent className="relative z-10 flex flex-col gap-4 p-5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {/* A wallet's page is Home with that wallet selected. */}
                <Link
                  href="/homepage"
                  onClick={() => setActiveWalletId(wallet.id)}
                  className="min-w-0 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {title}
                </Link>
                {wallet.isDefault ? (
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Default
                  </Badge>
                ) : null}
              </div>
              {isShared ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-accent/15 text-[10px] font-semibold text-foreground">
                    Shared
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {isOwner ? "Owner" : "Contributor"}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isShared ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 px-2 font-bold"
                aria-label={`Members, ${memberCount} ${memberCount === 1 ? "person" : "people"}`}
                onClick={() => onOpenMembers?.(wallet)}
              >
                <Users />
                {memberCount}
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon-sm" className="size-8 max-sm:size-10">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Wallet actions</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {isShared ? (
                  isOwner ? (
                    <>
                      <DropdownMenuItem onClick={() => onEdit(wallet)}>
                        <Edit2 className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenMembers?.(wallet)}>
                        <Users className="mr-2 size-4" />
                        Members
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
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => onOpenMembers?.(wallet)}>
                        <Users className="mr-2 size-4" />
                        Members
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => onLeave?.(wallet)}
                      >
                        <LogOut className="mr-2 size-4" />
                        Leave wallet
                      </DropdownMenuItem>
                    </>
                  )
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(wallet)}>
                      <Edit2 className="mr-2 size-4" />
                      Edit
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
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Balance Section */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isShared ? "Shared Balance" : "Current Balance"}
          </span>
          <div
            className="text-2xl font-extrabold sm:text-3xl"
            style={{ color: shadeHex(color, 0.4) }}
          >
            {formatBaht(wallet.balance)}
          </div>
        </div>

        {/* Members row (shared wallets) */}
        {isShared && members.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {members.slice(0, 3).map((member) => (
                <MemberAvatar key={member.id} id={member.id} name={member.name} size="sm" />
              ))}
              {memberCount > 3 ? (
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-full bg-muted text-[10.5px] font-bold text-muted-foreground ring-2 ring-card"
                >
                  +{memberCount - 3}
                </span>
              ) : null}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {isOwner
                ? members.map((member) => member.name).join(", ")
                : `Owner: ${wallet.ownerName ?? "Unknown"}`}
            </span>
          </div>
        ) : null}

        {/* Saving Goal Progress Section */}
        {isSaving ? (
          <div
            className={cn(
              "mt-auto flex flex-col gap-2 rounded-xl border p-3 pt-2.5 transition-colors",
              reached
                ? "border-emerald-500/30 bg-card/90 shadow-xs backdrop-blur-sm"
                : "border-border/50 bg-card/60"
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-foreground">Goal: {formatBaht(goal)}</span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  reached
                    ? "font-bold text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              >
                {reached ? "Goal reached! 🎉" : `${formatBaht(remaining)} left`}
              </span>
            </div>
            <Progress
              value={percent}
              className={cn("h-2", reached && "[&>div]:bg-emerald-500")}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span
                className={cn(
                  reached && "font-semibold text-emerald-600 dark:text-emerald-400"
                )}
              >
                {percent}% saved
              </span>
              <span className="font-semibold text-foreground">{formatBaht(wallet.balance)}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
