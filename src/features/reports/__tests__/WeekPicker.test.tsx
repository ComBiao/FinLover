// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WeekPicker } from "@/features/reports/components/WeekPicker";

const WEEK = { startDate: "2026-10-12", endDate: "2026-10-18" };

describe("WeekPicker", () => {
  beforeEach(() => {
    // Wednesday 21 Oct 2026, local noon
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 21, 12));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("names the week and steps by one week with the arrows", () => {
    const onShift = vi.fn();
    render(<WeekPicker range={WEEK} onPickDay={() => {}} onShift={onShift} />);

    expect(screen.getByRole("button", { name: /12 Oct – 18 Oct 2026/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(onShift).toHaveBeenNthCalledWith(1, -1);
    expect(onShift).toHaveBeenNthCalledWith(2, 1);
  });

  it("jumps to the current week from the calendar", () => {
    const onPickDay = vi.fn();
    render(<WeekPicker range={WEEK} onPickDay={onPickDay} onShift={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /12 Oct – 18 Oct 2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "This week" }));

    expect(onPickDay).toHaveBeenCalledWith("2026-10-21");
  });
});
