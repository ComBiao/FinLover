"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type AddTransactionFabProps = {
  onClick: () => void;
};

/**
 * Phone-only floating "add" button. It sits just above the BottomNav (hence
 * the offset) and stands in for the page header's Add Transaction button,
 * which is hidden below `md`.
 */
export function AddTransactionFab({ onClick }: AddTransactionFabProps) {
  return (
    <Button
      type="button"
      size="icon-lg"
      aria-label="New transaction"
      onClick={onClick}
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg md:hidden"
    >
      <Plus className="size-6" />
    </Button>
  );
}
