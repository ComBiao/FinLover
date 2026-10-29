// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SlidingToggle } from "@/features/reports/components/SlidingToggle";

const OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly", disabled: true, title: "Too many monthly buckets" },
] as const;

describe("SlidingToggle", () => {
  afterEach(() => cleanup());

  it("marks the chosen option as selected", () => {
    render(<SlidingToggle aria-label="Interval" value="weekly" onValueChange={() => {}} options={[...OPTIONS]} />);

    expect(screen.getByRole("tablist", { name: "Interval" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Weekly" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Daily" })).toHaveAttribute("aria-selected", "false");
  });

  it("reports the option that is picked", () => {
    const onValueChange = vi.fn();
    render(<SlidingToggle aria-label="Interval" value="weekly" onValueChange={onValueChange} options={[...OPTIONS]} />);

    fireEvent.click(screen.getByRole("tab", { name: "Daily" }));

    expect(onValueChange).toHaveBeenCalledWith("daily");
  });

  it("does not pick a disabled option and explains why on hover", () => {
    const onValueChange = vi.fn();
    render(<SlidingToggle aria-label="Interval" value="weekly" onValueChange={onValueChange} options={[...OPTIONS]} />);

    const monthly = screen.getByRole("tab", { name: "Monthly" });
    fireEvent.click(monthly);

    expect(monthly).toHaveAttribute("aria-disabled", "true");
    expect(monthly).toHaveAttribute("title", "Too many monthly buckets");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
