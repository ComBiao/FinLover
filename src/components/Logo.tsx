import { CreditCard } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function Logo({ className, iconClassName, textClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-md bg-primary",
          iconClassName
        )}
      >
        <CreditCard className="size-4 text-primary-foreground" />
      </div>
      <span className={cn("text-lg font-bold text-foreground", textClassName)}>
        Finlover
      </span>
    </div>
  );
}
