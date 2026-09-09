export type DateRangePreset = "today" | "this_week" | "this_month" | "custom";

export type DateRange = {
  from?: Date;
  to?: Date;
};
