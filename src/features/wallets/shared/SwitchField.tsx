"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SwitchFieldProps = {
  id: string;
  label: string;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * A labelled on/off row built on the shadcn `Switch`. Used for the wallet
 * options (saving goal, shared wallet) in place of the old checkboxes.
 */
export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchFieldProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id} className="cursor-pointer font-medium">
          {label}
        </Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch
        id={id}
        aria-label={label}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(Boolean(next))}
        disabled={disabled}
      />
    </div>
  );
}
