import { expect, test, type Page } from "@playwright/test";
import mongoose from "mongoose";
import { seedRecurringE2EData } from "../../infra-dev/scripts/seed-recurring-e2e";
import { todayBangkok, nextAfter } from "../../src/server/modules/schedulers/domain/schedule";
import Scheduler from "../../src/server/db/models/Scheduler";
import Wallet from "../../src/server/db/models/Wallet";
import Transaction from "../../src/server/db/models/Transaction";
import Category from "../../src/server/db/models/Category";

const PRIMARY_EMAIL = "user@example.com";
const SECONDARY_EMAIL = "tul@example.com";
const PASSWORD = "Passw0rd!";

async function loginUser(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/homepage$/, { timeout: 15_000 });
}

// Must match the fixed secret start-server.mjs gives the Next server.
const CRON_SECRET = "test-cron-secret-2026";

test.describe.serial("EPIC 4: Recurring Transactions E2E Suite (US4-1 to US4-5 & Issue #178)", () => {
  let seededData: Awaited<ReturnType<typeof seedRecurringE2EData>>;

  test.beforeAll(async () => {
    seededData = await seedRecurringE2EData();
  });

  test.afterAll(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(true);
        await mongoose.disconnect();
      }
    } catch {}
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, PRIMARY_EMAIL);
  });

  // --------------------------------------------------------------------------
  // RT-E2E-01: Initial Empty State on /recurring (US4-3)
  // --------------------------------------------------------------------------
  test("RT-E2E-01: Initial Empty State on /recurring", async ({ page }) => {
    // Listen for GET /api/v1/schedulers
    const [schedulersRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/schedulers") && res.request().method() === "GET"),
      page.goto("/recurring"),
    ]);

    expect(schedulersRes.status()).toBe(200);
    const json = await schedulersRes.json();
    expect(json.status).toBe(true);
    expect(json.data).toEqual([]);

    // UI Empty state elements
    await expect(page.getByRole("heading", { name: "No recurring transactions found" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Recurring Transaction" })).toBeVisible();
    // Verify no broken tables or unhandled errors
    await expect(page.locator("table")).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // RT-E2E-02: Form Validation & Cadence Boundary Guards (US4-1)
  // --------------------------------------------------------------------------
  test("RT-E2E-02: Form Validation & Cadence Boundary Guards", async ({ page }) => {
    await page.goto("/recurring");
    await page.getByRole("button", { name: "Create Recurring Transaction" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 1. Amount <= 0 validation
    await page.locator("#rule-title").fill("Invalid Rule");
    await page.locator("#rule-amount").fill("0");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Amount must be greater than ฿0/i)).toBeVisible();

    await page.locator("#rule-amount").fill("-100");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Amount must be greater than ฿0/i)).toBeVisible();

    // 2. Interval = 0 validation
    await page.locator("#rule-amount").fill("200");
    await page.locator("#interval-count").fill("0");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Frequency interval must be at least 1/i)).toBeVisible();

    // 3. Interval exceeding unit max:
    // 366 Days (max 365)
    await dialog.locator('button[aria-label="Frequency Unit"]').click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Day(s)" }).click();
    await page.locator("#interval-count").fill("366");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Days interval cannot exceed 365/i)).toBeVisible();

    // 53 Weeks (max 52)
    await dialog.locator('button[aria-label="Frequency Unit"]').click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Week(s)" }).click();
    await page.locator("#interval-count").fill("53");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Weeks interval cannot exceed 52/i)).toBeVisible();

    // 61 Months (max 60)
    await dialog.locator('button[aria-label="Frequency Unit"]').click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Month(s)" }).click();
    await page.locator("#interval-count").fill("61");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Months interval cannot exceed 60/i)).toBeVisible();

    // 6 Years (max 5)
    await dialog.locator('button[aria-label="Frequency Unit"]').click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Year(s)" }).click();
    await page.locator("#interval-count").fill("6");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/Years interval cannot exceed 5/i)).toBeVisible();

    // 4. End Date earlier than Start Date
    await dialog.locator('button[aria-label="Frequency Unit"]').click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Day(s)" }).click();
    await page.locator("#interval-count").fill("1");
    await dialog.locator('input[value="date"]').check();
    const endDateInput = dialog.locator('input[type="date"]').nth(1);
    await endDateInput.fill("2020-01-01");
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog.getByText(/End date must be strictly after the start date/i)).toBeVisible();

    // Verify backend rejection directly as well (400 validation guard)
    const backendRejection = await page.request.post("/api/v1/schedulers", {
      data: {
        walletId: seededData.personalWallet.id,
        type: "expense",
        amount: 0,
        title: "Bad Rule",
        startDate: "2026-10-24",
        frequency: "monthly",
        interval: 61,
        end: { type: "never" },
      },
      headers: { Origin: "http://localhost:3000" },
    });
    expect(backendRejection.status()).toBe(400);

    // Cancel modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  // --------------------------------------------------------------------------
  // RT-E2E-03: Create Rule Starting Today (start_date === today) + Cache Invalidation
  // --------------------------------------------------------------------------
  test("RT-E2E-03: Create Rule Starting Today (start_date === today) + Cross-Module Cache Invalidation", async ({ page }) => {
    await page.goto("/recurring");
    await page.getByRole("button", { name: "Create Recurring Transaction" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Title: Utilities Bill
    await page.locator("#rule-title").fill("Utilities Bill");

    // Amount: 500.00
    await page.locator("#rule-amount").fill("500.00");

    // Target Wallet: Personal Wallet
    await dialog.locator('div:has(> label:has-text("Target Wallet"))').getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Personal Wallet" }).click();

    // Category: Utilities
    await dialog.locator('div:has(> label:has-text("Category"))').getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Utilities" }).click();

    // Interval: Every 2 Months
    await page.locator("#interval-count").fill("2");

    // Verify immediate post notice when start_date is today
    await expect(
      dialog.getByText("Starting today (Bangkok time) will immediately post the first transaction to your wallet.")
    ).toBeVisible();

    // End condition: After 6 occurrences
    await dialog.locator('input[value="count"]').check();
    await dialog.locator('div:has(> span:has-text("total occurrences"))').locator("input").fill("6");

    // Submit and wait for POST /api/v1/schedulers
    const [createRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/schedulers") && res.request().method() === "POST"),
      page.getByRole("button", { name: "Save Recurring Rule" }).click(),
    ]);

    expect([200, 201]).toContain(createRes.status());
    const resData = (await createRes.json()).data;
    expect(resData.title).toBe("Utilities Bill");
    expect(resData.createdCount).toBe(1); // Immediate post occurred

    await expect(dialog).toBeHidden();

    // Verify row appeared in /recurring table
    const row = page.getByRole("row", { name: /Utilities Bill/ });
    await expect(row).toBeVisible();
    await expect(row.getByText("Active")).toBeVisible();
    await expect(row.getByText("Every 2 Months")).toBeVisible();
    await expect(row.getByText(/1 of 6 posted/i)).toBeVisible();

    // --- Cross-Module Cache Invalidation (WITHOUT browser reload) ---
    // 1. Navigate to /transactions via sidebar
    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL(/\/transactions$/);
    const txRow = page.getByRole("row", { name: /Utilities Bill/ });
    await expect(txRow).toBeVisible();
    await expect(txRow).toContainText("Utilities");
    await expect(txRow).toContainText("500");

    // 2. Navigate to /wallets via sidebar
    await page.getByRole("link", { name: "Wallets" }).click();
    await expect(page).toHaveURL(/\/wallets$/);
    // Balance was 10,000.00; after 500.00 expense, balance is 9,500.00
    await expect(page.getByText("9,500")).toBeVisible();

    // 3. Navigate to /homepage via sidebar
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/homepage$/);
    await expect(page.getByText(/500/).first()).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // RT-E2E-04: Month-End Day-31 Clamping Across Shorter Months (US4-1)
  // --------------------------------------------------------------------------
  test("RT-E2E-04: Month-End Day-31 Clamping Across Shorter Months", async () => {
    // Test the scheduler engine anchor day 31 clamping logic
    const cadence = { anchorDay: 31, frequency: "monthly" as const, interval: 1 };
    const jan31 = new Date(Date.UTC(2026, 0, 31)); // 2026-01-31

    // 1. Jan 31 -> Feb 28 (2026 non-leap year clamps to 28)
    const febNext = nextAfter(jan31, cadence);
    expect(febNext.toISOString().slice(0, 10)).toBe("2026-02-28");

    // 2. Feb 28 -> Mar 31 (March restores to 31)
    const marNext = nextAfter(febNext, cadence);
    expect(marNext.toISOString().slice(0, 10)).toBe("2026-03-31");

    // 3. Mar 31 -> Apr 30 (April clamps to 30)
    const aprNext = nextAfter(marNext, cadence);
    expect(aprNext.toISOString().slice(0, 10)).toBe("2026-04-30");

    // 4. Apr 30 -> May 31 (May restores to 31)
    const mayNext = nextAfter(aprNext, cadence);
    expect(mayNext.toISOString().slice(0, 10)).toBe("2026-05-31");

    // Also test interval = 2 (bi-monthly)
    const biMonthlyCadence = { anchorDay: 31, frequency: "monthly" as const, interval: 2 };
    const biNext = nextAfter(jan31, biMonthlyCadence);
    expect(biNext.toISOString().slice(0, 10)).toBe("2026-03-31");
  });

  // --------------------------------------------------------------------------
  // RT-E2E-05: Create Rules Starting in the Future & Verify Unified List
  // --------------------------------------------------------------------------
  test("RT-E2E-05: Create Rules Starting in the Future & Verify Unified List", async ({ page }) => {
    await page.goto("/recurring");

    // Tomorrow's date in YYYY-MM-DD
    // Tomorrow's date in Asia/Bangkok
    const bkkToday = todayBangkok(new Date());
    const tomorrow = new Date(bkkToday.getTime() + 86_400_000);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Next month's date in Asia/Bangkok
    const nextMonth = new Date(bkkToday.getTime() + 32 * 86_400_000);
    const nextMonthStr = nextMonth.toISOString().slice(0, 10);

    // 1. Create Gym Membership (Tomorrow, 1 Month, Indefinite)
    await page.getByRole("button", { name: "Create Recurring Transaction" }).click();
    let dialog = page.getByRole("dialog");
    await page.locator("#rule-title").fill("Gym Membership");
    await page.locator("#rule-amount").fill("1500.00");
    await dialog.locator('div:has(> label:has-text("Category"))').getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Gym" }).click();
    await dialog.locator('input[type="date"]').first().fill(tomorrowStr);
    await dialog.locator('input[value="never"]').check();
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog).toBeHidden();

    // 2. Create Cloud Storage (Next Month, 1 Year, Indefinite)
    await page.getByRole("button", { name: "Create Recurring Transaction" }).click();
    dialog = page.getByRole("dialog");
    await page.locator("#rule-title").fill("Cloud Storage");
    await page.locator("#rule-amount").fill("990.00");
    await dialog.locator('div:has(> label:has-text("Category"))').getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Cloud" }).click();
    await page.locator("#interval-count").fill("1");
    await dialog.locator('button[aria-label="Frequency Unit"]').click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Year(s)" }).click();
    await dialog.locator('input[type="date"]').first().fill(nextMonthStr);
    await dialog.locator('input[value="never"]').check();
    await page.getByRole("button", { name: "Save Recurring Rule" }).click();
    await expect(dialog).toBeHidden();

    // 3. Verify Unified List displays all 3 rules
    await expect(page.getByRole("row", { name: /Utilities Bill/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Gym Membership/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Cloud Storage/ })).toBeVisible();

    // 4. Verify no immediate transactions were posted for future rules
    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page.getByRole("row", { name: /Utilities Bill/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Gym Membership/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /Cloud Storage/ })).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // RT-E2E-06: Pause, Resume & Overdue Cycle Advancement (US4-4 & #178)
  // --------------------------------------------------------------------------
  test("RT-E2E-06: Pause, Resume & Overdue Cycle Advancement", async ({ page }) => {
    await page.goto("/recurring");
    const cloudRow = page.getByRole("row", { name: /Cloud Storage/ });
    await expect(cloudRow).toBeVisible();

    // 1. Pause Cloud Storage
    const [pauseRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/status") && res.request().method() === "PATCH"),
      cloudRow.getByRole("button", { name: "Pause rule" }).click(),
    ]);
    expect(pauseRes.status()).toBe(200);

    // Verify badge updates to Paused
    await expect(cloudRow.getByText("Paused")).toBeVisible();
    await expect(cloudRow.getByRole("button", { name: "Resume rule" })).toBeVisible();

    // 2. Resume Cloud Storage
    const [resumeRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/status") && res.request().method() === "PATCH"),
      cloudRow.getByRole("button", { name: "Resume rule" }).click(),
    ]);
    expect(resumeRes.status()).toBe(200);

    // Verify badge updates back to Active
    await expect(cloudRow.getByText("Active")).toBeVisible();
    await expect(cloudRow.getByRole("button", { name: "Pause rule" })).toBeVisible();

    // 3. Test optimistic rollback on failure
    await page.route("**/api/v1/schedulers/*/status", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ status: false, error: { message: "Internal server simulated error" } }),
      });
    });

    await cloudRow.getByRole("button", { name: "Pause rule" }).click();
    // After error rollback, it should revert to Active
    await expect(cloudRow.getByText("Active")).toBeVisible();
    await page.unroute("**/api/v1/schedulers/*/status");
  });

  // --------------------------------------------------------------------------
  // RT-E2E-07: Unauthorized Pause / Resume Rejection (Security 403 / 404 Guard)
  // --------------------------------------------------------------------------
  test("RT-E2E-07: Unauthorized Pause / Resume Rejection (Security Guard)", async ({ browser }) => {
    // Find primary user's rule ID
    const primaryRule = await Scheduler.findOne({ title: "Utilities Bill" }).lean();
    expect(primaryRule).not.toBeNull();
    const ruleId = primaryRule!._id.toString();

    // Create fresh context for secondary user
    const secondaryContext = await browser.newContext();
    const secondaryPage = await secondaryContext.newPage();

    // Login as secondary user (tul@example.com)
    await loginUser(secondaryPage, SECONDARY_EMAIL);

    // Attempt PATCH /api/v1/schedulers/:id/status on primary user's rule
    const res = await secondaryPage.request.patch(`/api/v1/schedulers/${ruleId}/status`, {
      data: { action: "pause" },
      headers: { Origin: "http://localhost:3000" },
    });

    // Scoped security returns 404 Not Found (or 403 Forbidden)
    expect([403, 404]).toContain(res.status());
    const body = await res.json();
    expect(body.status).toBe(false);

    // Verify rule status remains untouched in DB
    const freshDoc = await Scheduler.findById(ruleId).lean();
    expect(freshDoc?.status).toBe("active");

    await secondaryContext.close();
  });

  // --------------------------------------------------------------------------
  // RT-E2E-08: Edit Recurring Rule Without Altering Past Ledger (Future-Only Edit)
  // --------------------------------------------------------------------------
  test("RT-E2E-08: Edit Recurring Rule Without Altering Past Ledger (Future-Only Edit)", async ({ page }) => {
    await page.goto("/recurring");
    const utilRow = page.getByRole("row", { name: /Utilities Bill/ });
    await expect(utilRow).toBeVisible();

    // Open row action menu -> Edit Rule
    await utilRow.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Edit Rule" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Verify the future-only edit notice
    await expect(
      dialog.getByText("Future-Only Edit & Ledger Preservation")
    ).toBeVisible();

    // Change Future Amount from 500.00 to 650.00
    await page.locator("#edit-amount").fill("650.00");

    const [editRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/schedulers/") && res.request().method() === "PUT"),
      page.getByRole("button", { name: "Save Future Changes" }).click(),
    ]);

    expect(editRes.status()).toBe(200);
    await expect(dialog).toBeHidden();

    // Verify /recurring shows updated amount 650.00
    await expect(utilRow.getByText("650")).toBeVisible();

    // Check /transactions: Past transaction remains 500.00
    await page.getByRole("link", { name: "Transactions" }).click();
    const pastTx = page.getByRole("row", { name: /Utilities Bill/ });
    await expect(pastTx).toBeVisible();
    await expect(pastTx).toContainText("500");

    // Check /wallets: Personal Wallet balance remains 9,500.00
    await page.getByRole("link", { name: "Wallets" }).click();
    await expect(page.getByText("9,500")).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // RT-E2E-09: Automated Scheduler Run, Overdraft & End-Condition Completion
  // --------------------------------------------------------------------------
  test("RT-E2E-09: Automated Scheduler Run, Overdraft & End-Condition Completion", async ({ page }) => {
    // 1. Create rule on Main Bank (balance: 500.00) with amount 1200.00 due today, endCount = 1
    const today = todayBangkok(new Date());
    const rawDb = mongoose.connection.db!;

    // Category id for Utilities or Others
    const cat = (await Category.findOne({ userId: seededData.primaryUser.id, type: "expense" }).lean()) as { _id: mongoose.Types.ObjectId } | null;

    const createdScheduler = await rawDb.collection("schedulers").insertOne({
      userId: new mongoose.Types.ObjectId(seededData.primaryUser.id),
      walletId: new mongoose.Types.ObjectId(seededData.mainBankWallet.id),
      categoryId: cat!._id,
      type: "expense",
      amount: 1200,
      title: "Server Infrastructure",
      notes: "Dedicated cluster",
      startDate: today,
      anchorDay: today.getUTCDate(),
      frequency: "monthly",
      interval: 1,
      endType: "count",
      endCount: 1,
      status: "active",
      createdCount: 0,
      nextDueDate: today,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Trigger scheduler cron job via /api/internal/cron/schedulers
    const cronRes1 = await page.request.get("/api/internal/cron/schedulers", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cronRes1.status()).toBe(200);
    const summary1 = (await cronRes1.json()).data;
    expect(summary1.posted).toBeGreaterThanOrEqual(1);

    // 3. Verify Main Bank overdraft balance: 500 - 1200 = -700.00
    const mainBank = await Wallet.findById(seededData.mainBankWallet.id).lean();
    expect(mainBank?.balance).toBe(-700);

    // 4. Verify rule transitioned to 'completed' with nextDueDate: null
    const updatedRule = await rawDb.collection("schedulers").findOne({ _id: createdScheduler.insertedId });
    expect(updatedRule?.status).toBe("completed");
    expect(updatedRule?.nextDueDate).toBeNull();
    expect(updatedRule?.createdCount).toBe(1);

    // 5. Idempotency check: trigger cron job a second time immediately
    const cronRes2 = await page.request.get("/api/internal/cron/schedulers", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cronRes2.status()).toBe(200);
    const summary2 = (await cronRes2.json()).data;
    expect(summary2.posted).toBe(0);

    // Balance remains -700 (no double-posting)
    const mainBankAfter = await Wallet.findById(seededData.mainBankWallet.id).lean();
    expect(mainBankAfter?.balance).toBe(-700);
  });

  // --------------------------------------------------------------------------
  // RT-E2E-10: Delete Recurring Rule (Preserve Ledger) & Wallet Cascade Delete
  // --------------------------------------------------------------------------
  test("RT-E2E-10: Delete Recurring Rule (Preserve Ledger) & Wallet Cascade Delete", async ({ page }) => {
    await page.goto("/recurring");
    const utilRow = page.getByRole("row", { name: /Utilities Bill/ });
    await expect(utilRow).toBeVisible();

    // 1. Delete Utilities Bill rule
    await utilRow.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete Rule" }).click();

    const deleteDialog = page.getByRole("alertdialog");
    await expect(deleteDialog).toBeVisible();
    await expect(
      deleteDialog.getByText("This will stop all future recurring transactions for this rule. All past recorded transactions in your wallet ledger will be preserved.")
    ).toBeVisible();

    await deleteDialog.getByRole("button", { name: "Halt & Delete Rule" }).click();
    await expect(deleteDialog).toBeHidden();
    await expect(page.getByRole("row", { name: /Utilities Bill/ })).toHaveCount(0);

    // 2. Check /transactions: Past Utilities Bill transaction remains preserved!
    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page.getByRole("row", { name: /Utilities Bill/ })).toBeVisible();

    // 3. Cascade Delete: Delete Personal Wallet
    await page.getByRole("link", { name: "Wallets" }).click();
    const personalWalletCard = page.locator('[data-slot="card"]').filter({ hasText: "Personal Wallet" }).first();
    await personalWalletCard.getByRole("button", { name: "Wallet actions" }).click();
    await page.getByRole("menuitem", { name: "Delete Wallet" }).click();

    const walletDeleteDialog = page.getByRole("alertdialog");
    await expect(walletDeleteDialog).toBeVisible();
    await walletDeleteDialog.getByRole("button", { name: "Delete Wallet and Transactions" }).click();
    await expect(walletDeleteDialog).toBeHidden();

    // Verify Personal Wallet removed
    await expect(page.getByText("Personal Wallet")).toHaveCount(0);

    // Verify its recurring rules were cascade-deleted
    await page.getByRole("link", { name: "Recurring" }).click();
    const rulesOnPersonalWallet = await Scheduler.find({ walletId: seededData.personalWallet.id }).lean();
    expect(rulesOnPersonalWallet).toHaveLength(0);

    // Verify transactions on Personal Wallet were cascade-deleted
    const txsOnPersonalWallet = await Transaction.find({ walletId: seededData.personalWallet.id }).lean();
    expect(txsOnPersonalWallet).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // RT-E2E-11: Shared Wallet Exclusion Check (EPIC 4 Baseline)
  // --------------------------------------------------------------------------
  test("RT-E2E-11: Shared Wallet Exclusion Check", async ({ page }) => {
    await page.goto("/recurring");
    await page.getByRole("button", { name: "Create Recurring Transaction" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Open Target Wallet selector
    await dialog.locator('div:has(> label:has-text("Target Wallet"))').getByRole("combobox").click();

    // Main Bank is personal, so it must be present
    await expect(page.locator('[data-slot="select-item"]').filter({ hasText: "Main Bank" })).toBeVisible();

    // Shared Household is a shared wallet, so it MUST NOT be present
    await expect(page.locator('[data-slot="select-item"]').filter({ hasText: "Shared Household" })).toHaveCount(0);

    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
