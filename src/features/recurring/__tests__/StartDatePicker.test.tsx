// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StartDatePicker,
  formatDayMonthYear,
} from "../components/StartDatePicker";

afterEach(() => {
  cleanup();
});

describe("StartDatePicker", () => {
  it("formats date as day month(string eg Jan, Feb) year", () => {
    expect(formatDayMonthYear("2027-04-14")).toBe("14 Apr 2027");
    expect(formatDayMonthYear("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDayMonthYear("2026-10-25")).toBe("25 Oct 2026");
    expect(formatDayMonthYear("2028-02-29")).toBe("29 Feb 2028");
  });

  it("renders large trigger with formatted date and weekday label", () => {
    render(
      <StartDatePicker
        value="2027-04-14"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("14 Apr 2027")).toBeInTheDocument();
    expect(screen.getByText(/Wednesday/i)).toBeInTheDocument();
  });

  it("steps day forward and backward with stepper buttons", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <StartDatePicker
        value="2027-04-14"
        onChange={onChange}
      />
    );

    const nextBtn = screen.getByRole("button", { name: "Next day" });
    await user.click(nextBtn);
    expect(onChange).toHaveBeenCalledWith("2027-04-15");

    const prevBtn = screen.getByRole("button", { name: "Previous day" });
    await user.click(prevBtn);
    expect(onChange).toHaveBeenCalledWith("2027-04-13");
  });

  it("allows easily selecting month via the 12-month grid in popover", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <StartDatePicker
        value="2027-04-14"
        onChange={onChange}
      />
    );

    // Open popover by clicking the trigger button
    const trigger = screen.getByRole("button", { name: /open calendar/i });
    await user.click(trigger);

    // Click on month-year button to switch to 12-month selector
    const monthHeaderBtn = screen.getByRole("button", { name: /April 2027/i });
    await user.click(monthHeaderBtn);

    // Verify 12-month grid is visible
    expect(screen.getByRole("button", { name: "Jan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dec" })).toBeInTheDocument();

    // Select October (Oct) in 1 click
    const octBtn = screen.getByRole("button", { name: "Oct" });
    await user.click(octBtn);

    // Month changes to October and updates value with clamped day
    expect(onChange).toHaveBeenCalledWith("2027-10-14");
  });

  it("allows selecting a specific day in the days grid", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <StartDatePicker
        value="2027-04-14"
        onChange={onChange}
      />
    );

    // Open popover
    await user.click(screen.getByRole("button", { name: /open calendar/i }));

    // Click day 20
    const day20Btn = screen.getByRole("button", { name: "20" });
    await user.click(day20Btn);

    expect(onChange).toHaveBeenCalledWith("2027-04-20");
  });

  it("supports quick jump preset chips like +1 Mo and +3 Mos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <StartDatePicker
        value="2027-04-14"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /open calendar/i }));

    const plus1MoBtn = screen.getByRole("button", { name: "+1 Mo" });
    await user.click(plus1MoBtn);

    expect(onChange).toHaveBeenCalledWith("2027-05-14");
  });
});

