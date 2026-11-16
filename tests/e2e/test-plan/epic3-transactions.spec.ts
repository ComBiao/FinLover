// Test plan, Epic 3 (Transaction Management): US3-1, US3-2, US3-3, US3-5. Case IDs match the test plan document.
import { expect, test, type Page, type PlaywrightWorkerArgs } from '@playwright/test';
import {
  apiCall, balance, categoryOf, newUser, openAs, openTransactions, recordVideos, removeTxns, rowTitles, saveTxn, searchBox, transactions, wallet,
  type TxnFields, type User,
} from './helpers';

recordVideos();

let guy: User;
let txnB: string;
let catB: string;
test.beforeAll(async ({ playwright }) => {
  guy = await newUser(playwright, 'Guy');
  const cash = (await wallet(guy, 'Cash')).id;
  txnB = (await guy.api('POST', '/api/v1/transactions', { walletId: cash, type: 'expense', amount: 10, date: '2026-10-25', title: 'B private' })).json.data.id;
  catB = (await guy.api('POST', '/api/v1/categories', { name: 'B only', type: 'expense' })).json.data.id;
});

async function userWithMainBank(playwright: PlaywrightWorkerArgs['playwright'], name: string) {
  const u = await newUser(playwright, name);
  const main = (await u.api('POST', '/api/v1/wallets', { name: 'Main Bank' })).json.data.id as string;
  await u.api('POST', '/api/v1/transactions', { walletId: main, type: 'income', amount: 10000, date: '2026-10-01', title: 'Opening', categoryId: u.cat('Salary') });
  return { u, main };
}

// ======================= US3-1 Add transaction =======================
test.describe('US3-1 Add transaction', () => {
  let u: User;
  let main: string;
  test.beforeAll(async ({ playwright }) => ({ u, main } = await userWithMainBank(playwright, 'Tester 3-1')));

  const base: TxnFields = { Type: 'Expense', Amount: '500.00', Date: '2026-10-25', Title: 'Lunch', Wallet: 'Main Bank', Category: 'Food & Drinks' };
  // [id, what is tested, changes to the base inputs, saved?, Main Bank balance afterwards]
  const cases: [string, string, TxnFields, boolean, number][] = [
    ['TC3-1-1', 'valid expense', {}, true, 9500],
    ['TC3-1-2', 'valid income', { Type: 'Income', Amount: '32000.00', Title: 'Salary Oct', Category: 'Salary' }, true, 42000],
    // The sign comes from Type, so the Amount field drops a typed minus: "-500" is saved as a 500 expense.
    ['TC3-1-4', 'negative amount saved as 500', { Amount: '-500' }, true, 9500],
    ['TC3-1-5', 'amount 0', { Amount: '0' }, false, 10000],
    ['TC3-1-6', 'empty amount', { Amount: '' }, false, 10000],
    ['TC3-1-7', 'amount not a number', { Amount: 'abc' }, false, 10000],
    ['TC3-1-8', 'empty date', { Date: '' }, false, 10000],
    ['TC3-1-9', 'empty title', { Title: '' }, false, 10000],
    ['TC3-1-10', 'title of 101 characters', { Title: 'x'.repeat(101) }, false, 10000],
    ['TC3-1-11', 'no wallet selected', { Wallet: null }, false, 10000],
    ['TC3-1-12', 'note of 256 characters', { Note: 'x'.repeat(256) }, false, 10000],
    ['TC3-1-13', 'note of 255 characters', { Note: 'x'.repeat(255) }, true, 9500],
  ];
  for (const [id, what, change, saved, after] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      await openAs(page, u);
      const f = { ...base, ...change };
      try {
        expect(await saveTxn(page, f), saved ? 'saved' : 'blocked (dialog stays open)').toBe(saved);
        expect(await balance(u, 'Main Bank')).toBe(after);
        if (saved) expect(await rowTitles(page)).toContain(f.Title);
        if (id === 'TC3-1-13') expect((await transactions(u)).find((t) => t.title === 'Lunch')?.note).toHaveLength(255);
        if (id === 'TC3-1-4') expect(Number((await transactions(u)).find((t) => t.title === 'Lunch')?.amount)).toBe(500);
      } finally {
        if (f.Title) await removeTxns(u, f.Title);
      }
    });
  }

  test('TC3-1-3 empty type (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC3-1-3', u, 'POST', '/api/v1/transactions', { walletId: main, type: '', amount: 500, date: '2026-10-25', title: 'Lunch', categoryId: u.cat('Food & Drinks') });
    expect(r.status).toBe(400);
    expect(await balance(u, 'Main Bank')).toBe(10000);
  });
});

// ======================= US3-2 Edit transaction =======================
test.describe('US3-2 Edit transaction', () => {
  let u: User;
  let main: string;
  let txn: string;
  let original: Record<string, unknown>;
  test.beforeAll(async ({ playwright }) => {
    ({ u, main } = await userWithMainBank(playwright, 'Tester 3-2'));
    original = { walletId: main, type: 'expense', amount: 500, date: '2026-10-25', title: 'Lunch', categoryId: u.cat('Food & Drinks') };
    txn = (await u.api('POST', '/api/v1/transactions', original)).json.data.id;
  });
  test.beforeEach(async () => { await u.api('PUT', `/api/v1/transactions/${txn}`, original); });

  const base: TxnFields = { Type: 'Expense', Amount: '550.00', Date: '2026-10-25', Title: 'Lunch', Category: 'Food & Drinks' };
  const cases: [string, string, TxnFields, boolean, number][] = [
    ['TC3-2-1', 'increase amount', {}, true, 9450],
    ['TC3-2-2', 'decrease amount', { Amount: '450.00' }, true, 9550],
    ['TC3-2-3', 'change type to income', { Type: 'Income', Category: 'Salary' }, true, 10550],
    ['TC3-2-4', 'change category only', { Amount: '500.00', Category: 'Transportation' }, true, 9500],
    ['TC3-2-5', 'negative amount saved as 500', { Amount: '-500' }, true, 9500],
    ['TC3-2-6', 'empty amount', { Amount: '' }, false, 9500],
    ['TC3-2-7', 'empty date', { Date: '' }, false, 9500],
    ['TC3-2-8', 'empty title', { Title: '' }, false, 9500],
  ];
  for (const [id, what, change, saved, after] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      await openAs(page, u);
      expect(await saveTxn(page, { ...base, ...change }, 'Lunch'), saved ? 'saved' : 'blocked (dialog stays open)').toBe(saved);
      expect(await balance(u, 'Main Bank')).toBe(after);
      if (id === 'TC3-2-4') expect((await categoryOf(u, 'Lunch')).category).toBe('Transportation');
      if (id === 'TC3-2-5') expect(Number((await categoryOf(u, 'Lunch')).txn?.amount)).toBe(500);
    });
  }

  const body = () => ({ ...original, amount: 550 });
  test("TC3-2-9 another user's transaction (HTTP API)", async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC3-2-9', u, 'PUT', `/api/v1/transactions/${txnB}`, body());
    expect([403, 404]).toContain(r.status);
    const theirs = (await transactions(guy)).find((t) => t.id === txnB);
    expect([theirs?.title, Number(theirs?.amount)]).toEqual(['B private', 10]);
  });
  test('TC3-2-10 transaction that does not exist (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC3-2-10', u, 'PUT', '/api/v1/transactions/000000000000000000000000', body());
    expect(r.status).toBe(404);
    expect(await balance(u, 'Main Bank')).toBe(9500);
  });
});

// ======================= US3-3 View history and filter =======================
test.describe('US3-3 View transaction history and filter', () => {
  let u: User;
  let main: string;
  const [T1, T2, T3, T4] = ['Coffee beans', 'Bus pass', 'Salary Oct', 'Snack'];
  test.beforeAll(async ({ playwright }) => {
    u = await newUser(playwright, 'Tester 3-3');
    main = (await u.api('POST', '/api/v1/wallets', { name: 'Main Bank' })).json.data.id;
    const cash = (await wallet(u, 'Cash')).id;
    const add = (o: object) => u.api('POST', '/api/v1/transactions', o);
    await add({ walletId: main, type: 'expense', amount: 500, date: '2026-10-25', title: T1, categoryId: u.cat('Food & Drinks') });
    await add({ walletId: cash, type: 'expense', amount: 300, date: '2026-10-20', title: T2, categoryId: u.cat('Transportation') });
    await add({ walletId: main, type: 'income', amount: 32000, date: '2026-10-01', title: T3, categoryId: u.cat('Salary') });
    await add({ walletId: cash, type: 'expense', amount: 120, date: '2026-10-06', title: T4, note: 'latte', categoryId: u.cat('Food & Drinks') });
  });

  const pick = async (p: Page, current: RegExp, option: string) => {
    await p.getByRole('combobox').filter({ hasText: current }).filter({ visible: true }).first().click();
    await p.getByRole('option', { name: new RegExp('^' + option) }).first().click();
    await p.waitForTimeout(900);
  };
  const pickRange = async (p: Page, from: string, to?: string) => {
    await p.getByRole('radio', { name: 'Day', exact: true }).click();
    await p.waitForTimeout(800);
    await p.getByRole('button', { name: 'Previous period' }).locator('..').locator('button[aria-haspopup="dialog"]').click();
    const pop = p.locator('[data-slot="popover-content"], [role="dialog"]').filter({ has: p.getByRole('button', { name: 'Done' }) }).first();
    await pop.waitFor();
    const day = (iso: string) => pop.getByRole('button', { name: new RegExp(`October ${Number(iso.slice(8))}(st|nd|rd|th)?,? 2026`) }).first();
    // The calendar opens with today (29 Oct, the pinned clock) selected; clicking it clears that so the next click starts a new range.
    await day('2026-10-29').click();
    await day(from).click();
    if (to) await day(to).click();
    await p.waitForTimeout(800);
    await pop.getByRole('button', { name: 'Done' }).click();
    await p.waitForTimeout(1500);
  };
  type Filter = { type?: string; category?: string; wallet?: string; range?: [string, string?]; search?: string };
  const apply = async (p: Page, f: Filter) => {
    await openTransactions(p);
    if (f.type) await pick(p, /All Types/, f.type);
    if (f.category) await pick(p, /All categories/i, f.category);
    if (f.wallet) await pick(p, /All wallets/i, f.wallet);
    if (f.range) await pickRange(p, ...f.range);
    if (f.search !== undefined) { await searchBox(p).fill(f.search); await p.waitForTimeout(2000); }
  };

  const cases: [string, string, Filter, string[]][] = [
    ['TC3-3-1', 'no filter', {}, [T1, T2, T4, T3]],
    ['TC3-3-2', 'category Food & Drinks', { category: 'Food & Drinks' }, [T1, T4]],
    ['TC3-3-3', 'wallet Cash', { wallet: 'Cash' }, [T2, T4]],
    ['TC3-3-4', 'type Income', { type: 'Income' }, [T3]],
    ['TC3-3-5', 'date range 6-20 Oct', { range: ['2026-10-06', '2026-10-20'] }, [T2, T4]],
    ['TC3-3-7', 'date range with start only', { range: ['2026-10-25'] }, [T1]],
    ['TC3-3-8', 'search ignores letter case', { search: 'COFFEE' }, [T1]],
    ['TC3-3-9', 'search matches the note', { search: 'latte' }, [T4]],
    ['TC3-3-10', 'search matches nothing', { search: 'zzz' }, []],
    ['TC3-3-11', 'search of spaces only', { search: '   ' }, [T1, T2, T4, T3]],
    ['TC3-3-12', 'several filters combined', { type: 'Expense', category: 'Food & Drinks', wallet: 'Cash', range: ['2026-10-01', '2026-10-10'] }, [T4]],
  ];
  for (const [id, what, filter, rows] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      await openAs(page, u);
      await apply(page, filter);
      expect(await rowTitles(page)).toEqual(rows);
      if (!rows.length) await expect(page.getByText(/no transactions/i).first()).toBeVisible();
    });
  }

  test('TC3-3-6 start date after end date (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC3-3-6', u, 'GET', `/api/v1/transactions/summary?walletId=${main}&from=2026-10-20&to=2026-10-06`);
    expect(r.status).toBe(400);
  });

  test('TC3-3-13 Reset Filters', async ({ page }) => {
    await openAs(page, u);
    await apply(page, { wallet: 'Cash', type: 'Income' });
    expect(await rowTitles(page)).toEqual([]);
    await page.getByRole('button', { name: 'Reset Filters' }).filter({ visible: true }).click();
    await page.waitForTimeout(1500);
    expect(await rowTitles(page)).toEqual([T1, T2, T4, T3]);
  });
});

// ======================= US3-5 Select category =======================
test.describe('US3-5 Select category on add/edit', () => {
  let u: User;
  let main: string;
  test.beforeAll(async ({ playwright }) => {
    ({ u, main } = await userWithMainBank(playwright, 'Tester 3-5'));
    const groceries = (await u.api('POST', '/api/v1/categories', { name: 'Groceries', type: 'expense' })).json.data.id;
    await u.api('POST', '/api/v1/categories', { name: 'Pet Supplies', type: 'expense' });
    await u.api('POST', '/api/v1/transactions', { walletId: main, type: 'expense', amount: 200, date: '2026-10-25', title: 'Shopping', categoryId: groceries });
  });

  const base: TxnFields = { Type: 'Expense', Amount: '200.00', Date: '2026-10-25', Title: 'Dinner', Wallet: 'Main Bank', Category: 'Food & Drinks' };
  // [id, what, changes, category the saved transaction should have]
  const cases: [string, string, TxnFields, string][] = [
    ['TC3-5-1', 'default category', {}, 'Food & Drinks'],
    ['TC3-5-2', 'custom category', { Title: 'Pet food', Category: 'Pet Supplies' }, 'Pet Supplies'],
    // With no pick the form keeps its preselected "Others" category.
    ['TC3-5-3', 'no category chosen saves Others', { Title: 'No category', Category: null }, 'Others'],
  ];
  for (const [id, what, change, category] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      await openAs(page, u);
      const f = { ...base, ...change };
      try {
        expect(await saveTxn(page, f), 'saved').toBe(true);
        expect((await categoryOf(u, f.Title!)).category).toBe(category);
      } finally {
        await removeTxns(u, f.Title!);
      }
    });
  }

  const post = (title: string, categoryId: string) => ({ walletId: main, type: 'expense', amount: 200, date: '2026-10-25', title, categoryId });
  test('TC3-5-4 income category on an expense (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC3-5-4', u, 'POST', '/api/v1/transactions', post('Mismatch', u.cat('Salary')));
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect((await categoryOf(u, 'Mismatch')).txn).toBeUndefined();
  });
  test("TC3-5-5 another user's category (HTTP API)", async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC3-5-5', u, 'POST', '/api/v1/transactions', post('Foreign', catB));
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect((await categoryOf(u, 'Foreign')).txn).toBeUndefined();
  });

  test('TC3-5-6 category list follows the type', async ({ page }) => {
    await openAs(page, u);
    await openTransactions(page);
    await page.getByRole('button', { name: 'Add Transaction' }).click();
    const d = page.getByRole('dialog');
    const types = d.getByRole('radiogroup', { name: 'Transaction type' });
    const cats = async () => (await d.getByRole('radiogroup', { name: 'Category' }).getByRole('radio').allInnerTexts()).map((s) => s.trim());
    await types.getByRole('radio', { name: 'Expense', exact: true }).click();
    await page.waitForTimeout(1000);
    const expense = await cats();
    expect(expense).toEqual(expect.arrayContaining(['Food & Drinks', 'Groceries', 'Pet Supplies']));
    expect(expense).not.toContain('Salary');
    await types.getByRole('radio', { name: 'Income', exact: true }).click();
    await page.waitForTimeout(1000);
    const income = await cats();
    expect(income).toContain('Salary');
    expect(income).not.toContain('Food & Drinks');
  });

  test('TC3-5-7 change category on edit', async ({ page }) => {
    await openAs(page, u);
    const before = await balance(u, 'Main Bank');
    expect(await saveTxn(page, { Category: 'Pet Supplies' }, 'Shopping'), 'saved').toBe(true);
    expect((await categoryOf(u, 'Shopping')).category).toBe('Pet Supplies');
    expect(await balance(u, 'Main Bank')).toBe(before);
  });
});
