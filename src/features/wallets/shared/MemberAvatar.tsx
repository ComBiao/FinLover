import { cn } from "@/lib/utils";

/** Soft pastel fills, picked per member so the same person always gets the same colour. */
const AVATAR_COLORS = ["#F6B8C8", "#B7A8F2", "#9FD8D5", "#F0C48A", "#A5C8F5", "#C6E2A8"];

function colorFor(id: string) {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

type MemberAvatarProps = {
  id: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
};

/** Initial-in-a-circle avatar for a wallet member (decorative: the name is always shown next to it). */
export function MemberAvatar({ id, name, size = "md", className }: MemberAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-foreground ring-2 ring-card",
        size === "sm" ? "size-7 text-[11px]" : "size-9 text-sm",
        className
      )}
      style={{ backgroundColor: colorFor(id) }}
    >
      {initial}
    </span>
  );
}
