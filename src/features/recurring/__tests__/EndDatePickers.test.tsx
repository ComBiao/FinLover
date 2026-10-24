// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MonthlyEndPicker,
  YearlyEndPicker,
  DailyWeeklyEndPicker,
  WeeklyIphoneClockPicker,
  isValidOccurrenceDate,
  isValidOccurrenceMonth,
  isValidOccurrenceYear,
} from "../components/EndDatePickers";

afterEach(() => {
  cleanup();
});

describe("EndDatePickers", () => {
  describe("Occurrence Validators", () => {
    it("validates daily occurrence dates correctly (e.g. every 2 days from 2027-01-01)", () => {
      // Start: 2027-01-01, Interval: 2 days -> occurrences on 2027-01-03, 2027-01-05, etc.
      expect(isValidOccurrenceDate("2027-01-01", "2027-01-01", 2, "days")).toBe(false); // <= start date
      expect(isValidOccurrenceDate("2027-01-02", "2027-01-01", 2, "days")).toBe(false); // day 2 not on cadence
      expect(isValidOccurrenceDate("2027-01-03", "2027-01-01", 2, "days")).toBe(true);  // day 3 allowed
      expect(isValidOccurrenceDate("2027-01-04", "2027-01-01", 2, "days")).toBe(false); // day 4 not on cadence
      expect(isValidOccurrenceDate("2027-01-05", "2027-01-01", 2, "days")).toBe(true);  // day 5 allowed
    });

    it("validates monthly occurrence months correctly (e.g. every 2 months from 2027-01-15)", () => {
      // Start: 2027-01, Interval: 2 months -> occurrences in Mar 2027, May 2027, Jul 2027, etc.
      expect(isValidOccurrenceMonth("2027-01", "2027-01-15", 2)).toBe(false);
      expect(isValidOccurrenceMonth("2027-02", "2027-01-15", 2)).toBe(false);
      expect(isValidOccurrenceMonth("2027-03", "2027-01-15", 2)).toBe(true);
      expect(isValidOccurrenceMonth("2027-04", "2027-01-15", 2)).toBe(false);
      expect(isValidOccurrenceMonth("2027-05", "2027-01-15", 2)).toBe(true);
    });

    it("validates yearly occurrence years correctly (e.g. every 2 years from 2027-05-20)", () => {
      // Start: 2027, Interval: 2 years -> occurrences in 2029, 2031, etc.
      expect(isValidOccurrenceYear(2027, "2027-05-20", 2)).toBe(false);
      expect(isValidOccurrenceYear(2028, "2027-05-20", 2)).toBe(false);
      expect(isValidOccurrenceYear(2029, "2027-05-20", 2)).toBe(true);
      expect(isValidOccurrenceYear(2030, "2027-05-20", 2)).toBe(false);
      expect(isValidOccurrenceYear(2031, "2027-05-20", 2)).toBe(true);
    });
  });

  describe("MonthlyEndPicker UI", () => {
    it("renders trigger with month label and steps by interval with next/prev buttons", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <MonthlyEndPicker
          startDate="2027-01-15"
          intervalN={2}
          value="2027-03"
          onChange={onChange}
        />
      );

      // Trigger shows March 2027
      expect(screen.getByText("March 2027")).toBeInTheDocument();

      // Prev button is disabled because 2027-03 is the first allowed month
      const prevBtn = screen.getByRole("button", { name: "Previous occurrence month" });
      expect(prevBtn).toBeDisabled();

      // Next button steps to next occurrence (2027-05)
      const nextBtn = screen.getByRole("button", { name: "Next occurrence month" });
      await user.click(nextBtn);
      expect(onChange).toHaveBeenCalledWith("2027-05");
    });

    it("disables non-occurrence months in the popover grid", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <MonthlyEndPicker
          startDate="2027-01-15"
          intervalN={2}
          value="2027-03"
          onChange={onChange}
        />
      );

      // Open popover
      await user.click(screen.getByText("March 2027"));

      // Jan and Feb are disabled
      expect(screen.getByRole("button", { name: "Jan" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Feb" })).toBeDisabled();

      // Mar is enabled and clickable
      const marBtn = screen.getByRole("button", { name: "Mar" });
      expect(marBtn).toBeEnabled();

      // Apr is disabled (not on 2-month interval)
      expect(screen.getByRole("button", { name: "Apr" })).toBeDisabled();

      // May is enabled (on 2-month interval)
      const mayBtn = screen.getByRole("button", { name: "May" });
      expect(mayBtn).toBeEnabled();

      await user.click(mayBtn);
      expect(onChange).toHaveBeenCalledWith("2027-05");
    });
  });

  describe("YearlyEndPicker UI", () => {
    it("renders trigger with year and disables non-occurrence years in the grid", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <YearlyEndPicker
          startDate="2027-05-20"
          intervalN={2}
          value={2029}
          onChange={onChange}
        />
      );

      expect(screen.getByText("2029")).toBeInTheDocument();

      // Prev button is disabled because 2029 is the first allowed year (2027 + 2)
      const prevBtn = screen.getByRole("button", { name: "Previous occurrence year" });
      expect(prevBtn).toBeDisabled();

      // Open popover
      await user.click(screen.getByText("2029"));

      const dialog = screen.getByRole("dialog");
      // 2027 and 2028 are disabled
      expect(within(dialog).getByRole("button", { name: "2027" })).toBeDisabled();
      expect(within(dialog).getByRole("button", { name: "2028" })).toBeDisabled();

      // 2029 is enabled inside dialog
      expect(within(dialog).getByRole("button", { name: "2029" })).toBeEnabled();

      // 2030 is disabled (not on 2-year interval)
      expect(within(dialog).getByRole("button", { name: "2030" })).toBeDisabled();

      // 2031 is enabled
      const y2031 = within(dialog).getByRole("button", { name: "2031" });
      expect(y2031).toBeEnabled();
      await user.click(y2031);
      expect(onChange).toHaveBeenCalledWith(2031);
    });
  });

  describe("DailyWeeklyEndPicker UI", () => {
    it("steps by interval days on next/prev buttons", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <DailyWeeklyEndPicker
          startDate="2027-01-01"
          intervalN={2}
          intervalUnit="days"
          value="2027-01-03"
          onChange={onChange}
        />
      );

      // Prev is disabled because 2027-01-03 is the first occurrence (2027-01-01 + 2 days)
      const prevBtn = screen.getByRole("button", { name: "Previous occurrence date" });
      expect(prevBtn).toBeDisabled();

      // Next steps to 2027-01-05
      const nextBtn = screen.getByRole("button", { name: "Next occurrence date" });
      await user.click(nextBtn);
      expect(onChange).toHaveBeenCalledWith("2027-01-05");
    });
  });

  describe("WeeklyIphoneClockPicker UI (iOS-Style Dual Wheel)", () => {
    it("renders weekly occurrences with month selector and steps month with stepper buttons", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <WeeklyIphoneClockPicker
          startDate="2027-01-03" // Sunday
          intervalN={1} // Every 1 week
          value="2027-01-10" // 1st week
          onChange={onChange}
        />
      );

      // Verify region and initial display
      expect(screen.getByRole("region", { name: /weekly end date iphone clock wheel selector/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Select month" })).toHaveTextContent("Jan 2027");
      expect(screen.getByText(/Sun, 10 Jan · Week 1/)).toBeInTheDocument();

      // Prev month button is disabled on the first occurrence month
      const prevBtn = screen.getByRole("button", { name: "Previous occurrence month" });
      expect(prevBtn).toBeDisabled();

      // Next month button steps to February 2027
      const nextBtn = screen.getByRole("button", { name: "Next occurrence month" });
      await user.click(nextBtn);
      expect(onChange).toHaveBeenCalledWith("2027-02-07");
    });

    it("allows selecting a month from the left Month drum roller", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <WeeklyIphoneClockPicker
          startDate="2027-01-03"
          intervalN={1}
          value="2027-01-10"
          onChange={onChange}
        />
      );

      // Click on March in the month drum
      const marDrumBtn = screen.getByRole("button", { name: "Month Mar 2027" });
      await user.click(marDrumBtn);

      expect(onChange).toHaveBeenCalledWith("2027-03-07");
    });

    it("allows opening the month popover and selecting any month", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <WeeklyIphoneClockPicker
          startDate="2027-01-03"
          intervalN={1}
          value="2027-01-10"
          onChange={onChange}
        />
      );

      // Open month popover
      const selectMonthBtn = screen.getByRole("button", { name: "Select month" });
      await user.click(selectMonthBtn);

      // Dialog is open with 12 months, click "May"
      const mayBtn = screen.getByRole("button", { name: "May" });
      await user.click(mayBtn);

      expect(onChange).toHaveBeenCalledWith("2027-05-02");
    });

    it("allows clicking a quick jump preset chip like +1 Mo", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <WeeklyIphoneClockPicker
          startDate="2027-01-03"
          intervalN={1}
          value="2027-01-10"
          onChange={onChange}
        />
      );

      const plus1MoBtn = screen.getByRole("button", { name: "+1 Mo" });
      await user.click(plus1MoBtn);

      expect(onChange).toHaveBeenCalledWith("2027-02-07");
    });

    it("allows clicking any occurrence row in the drum to select it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <WeeklyIphoneClockPicker
          startDate="2027-01-03"
          intervalN={1}
          value="2027-01-10"
          onChange={onChange}
        />
      );

      // Click on Week 3 row (2027-01-24)
      const week3Row = screen.getByRole("button", { name: /Week 3: Sun, 24 Jan 2027/ });
      await user.click(week3Row);

      expect(onChange).toHaveBeenCalledWith("2027-01-24");
    });
  });
});
