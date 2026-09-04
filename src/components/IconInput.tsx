import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type IconInputProps = React.ComponentProps<"input"> & {
  icon: LucideIcon;
};

export function IconInput({ icon: Icon, className, ...props }: IconInputProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-input bg-muted px-3.5 py-1",
        className
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <Input
        className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        {...props}
      />
    </div>
  );
}
