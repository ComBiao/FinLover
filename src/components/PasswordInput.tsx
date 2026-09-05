"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

/**
 * Password input field with lock icon and toggle visibility button (eye/eye-off).
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-input bg-muted px-3.5 py-1",
        className
      )}
    >
      <Lock className="size-4 shrink-0 text-muted-foreground" />
      <Input
        type={visible ? "text" : "password"}
        className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="shrink-0 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
      </button>
    </div>
  );
}
