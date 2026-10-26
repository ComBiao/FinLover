/**
 * Look shared by the report segmented controls (period and interval): a white pill with the
 * chosen segment filled in the brand green, so the current choice reads at a glance.
 * The pill is 36px (h-9) like the other filter controls: 1px border + 3px padding + 28px (h-7) segments.
 */
export const segmentedGroupClass = "h-9 rounded-xl border border-border bg-card p-[3px]";

export const segmentedItemClass =
  "h-7 rounded-lg px-3 text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm hover:aria-pressed:bg-primary/90 hover:aria-pressed:text-primary-foreground";
