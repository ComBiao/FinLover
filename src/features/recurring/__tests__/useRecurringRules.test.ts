import { beforeEach, describe, expect, it } from "vitest";
import { useRecurringRules } from "../store/useRecurringRules";

describe("useRecurringRules store", () => {
  beforeEach(() => {
    // Reset store before each test
    useRecurringRules.setState({
      rules: [],
      simulatedDate: "2026-10-23",
      logs: [],
      selectedRuleIdForLedger: "all",
      hasHydrated: true,
    });
  });

  it("adds a recurring rule with correct defaults", () => {
    const { addRule } = useRecurringRules.getState();

    const created = addRule({
      title: "Netflix Subscription",
      amount: 419,
      type: "expense",
      walletId: "w1",
      intervalN: 1,
      intervalUnit: "months",
      startDate: "2026-10-23",
      nextRunDate: "2026-10-23",
      endType: "never",
      status: "active",
    });

    expect(created.id).toBeDefined();
    expect(created.postedCount).toBe(0);
    expect(created.anchorDay).toBe(23);

    const rules = useRecurringRules.getState().rules;
    expect(rules).toHaveLength(1);
    expect(rules[0].title).toBe("Netflix Subscription");
  });

  it("updates rule for future-only edits (US4-5)", () => {
    const { addRule, updateRule } = useRecurringRules.getState();

    const rule = addRule({
      title: "Gym Membership",
      amount: 1500,
      type: "expense",
      walletId: "w1",
      intervalN: 1,
      intervalUnit: "months",
      startDate: "2026-08-01",
      nextRunDate: "2026-11-01",
      endType: "never",
      status: "active",
    });

    // Update future amount from 1500 to 1800
    updateRule(rule.id, { amount: 1800, intervalN: 2 });

    const updated = useRecurringRules.getState().rules.find((r) => r.id === rule.id);
    expect(updated?.amount).toBe(1800);
    expect(updated?.intervalN).toBe(2);
  });

  it("pauses and resumes rule advancing overdue cycles (US4-4)", () => {
    const { addRule, pauseRule, resumeRule } = useRecurringRules.getState();

    const rule = addRule({
      title: "Magazine",
      amount: 200,
      type: "expense",
      walletId: "w1",
      intervalN: 1,
      intervalUnit: "months",
      startDate: "2026-01-10",
      nextRunDate: "2026-03-10", // overdue
      endType: "never",
      status: "active",
    });

    pauseRule(rule.id);
    expect(useRecurringRules.getState().rules[0].status).toBe("paused");

    // Resume with advanced future date
    resumeRule(rule.id, "2026-11-10");
    const resumed = useRecurringRules.getState().rules[0];
    expect(resumed.status).toBe("active");
    expect(resumed.nextRunDate).toBe("2026-11-10");
  });

  it("records occurrence execution, increments postedCount, and completes when limit reached", () => {
    const { addRule, recordOccurrenceExecution } = useRecurringRules.getState();

    const rule = addRule({
      title: "3-Month Loan",
      amount: 5000,
      type: "expense",
      walletId: "w1",
      intervalN: 1,
      intervalUnit: "months",
      startDate: "2026-08-01",
      nextRunDate: "2026-08-01",
      endType: "count",
      totalOccurrences: 2,
      status: "active",
    });

    const mockLog = {
      id: "log-1",
      timestamp: "10:00:00",
      simulatedDate: "2026-08-01",
      ruleId: rule.id,
      ruleTitle: rule.title,
      amount: rule.amount,
      type: rule.type,
      walletName: "Main Bank",
      occurrenceNumber: 1,
      action: "posted" as const,
      message: "Run 1 posted",
    };

    recordOccurrenceExecution(rule.id, "2026-09-01", false, mockLog);

    let state = useRecurringRules.getState().rules[0];
    expect(state.postedCount).toBe(1);
    expect(state.nextRunDate).toBe("2026-09-01");
    expect(state.status).toBe("active");

    // Second run completes it
    recordOccurrenceExecution(rule.id, "2026-10-01", true, { ...mockLog, id: "log-2", occurrenceNumber: 2 });
    state = useRecurringRules.getState().rules[0];
    expect(state.postedCount).toBe(2);
    expect(state.status).toBe("completed");
  });

  it("deletes rule from store (US4-5)", () => {
    const { addRule, deleteRule } = useRecurringRules.getState();

    const rule = addRule({
      title: "Cancel Candidate",
      amount: 100,
      type: "expense",
      walletId: "w1",
      intervalN: 1,
      intervalUnit: "days",
      startDate: "2026-10-23",
      nextRunDate: "2026-10-23",
      endType: "never",
      status: "active",
    });

    deleteRule(rule.id);
    expect(useRecurringRules.getState().rules).toHaveLength(0);
  });
});

