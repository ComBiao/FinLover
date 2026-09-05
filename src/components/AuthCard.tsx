import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps {
  /** Which pastel gradient direction the illustration panel uses. */
  gradient: "a" | "b";
  /** Left panel on desktop, stacked above the form below `md`. */
  illustration: ReactNode;
  /** Right panel on desktop, the auth form. */
  children: ReactNode;
}

/**
 * Two-panel card layout for authentication pages with gradient illustration panel and form panel.
 */
export function AuthCard({ gradient, illustration, children }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl">
      <div className="grid items-stretch md:grid-cols-2">
        <div
          className={cn(
            "flex flex-col justify-between gap-9 p-8 sm:p-10 md:p-11",
            gradient === "a" ? "bg-gradient-pastel-a" : "bg-gradient-pastel-b"
          )}
        >
          {illustration}
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12 lg:px-13 lg:py-13">
          {children}
        </div>
      </div>
    </div>
  );
}
