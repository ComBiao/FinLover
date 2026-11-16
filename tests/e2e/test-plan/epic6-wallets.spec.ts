// Test plan, Epic 6 (Multiple Wallets): US6-1, US6-3, US6-4, US6-5. Case IDs match the test plan document.
import { expect, test, type Page } from '@playwright/test';
import { apiCall, closed, dialog, newUser, openAs, recordVideos, shareWith, wallet, walletMenu, wallets, type Json, type User } from './helpers';

recordVideos();

let guy: User;
test.beforeAll(async ({ playwright }) => { guy = await newUser(playwright, 'Guy'); });

/** Guy (a Contributor) opens the shared wallet's menu, then tries the owner-only action through the API. */
async function asContributor(page: Page, id: string, missingItem: string, method: string, url: string, body?: unknown) {
  await openAs(page, guy);
  const items = await walletMenu(page, 'Housemate Fund', { shared: true });
  expect(items).not.toContain(missingItem);
  await page.keyboard.press('Escape');
  const r = await apiCall(page, id, guy, method, url, body);
  expect(r.status).toBe(403);
}

// ======================= US6-1 Create wallet =======================
test.describe('US6-1 Create wallet', () => {
  let u: User;
  test.beforeAll(async ({ playwright }) => {
    u = await newUser(playwright, 'Tester 6-1');
    await u.api('POST', '/api/v1/wallets', { name: 'Main Bank' });
  });
  const removeNew = async () => { for (const w of await wallets(u)) if (!['Cash', 'Main Bank'].includes(w.name)) await u.api('DELETE', `/api/v1/wallets/${w.id}`); };

  type Form = { Name?: string; Color?: string | null; Icon?: string; Saving?: boolean; Goal?: string; HideBalance?: boolean };
  const base: Form = { Name: 'Travel Fund', Color: '#3B82F6', Icon: 'Travel' };
  const long = (n: number) => 'W'.repeat(n);
  // [id, what, changes, created?, extra check on the created wallet]
  const cases: [string, string, Form, boolean, ((w: Json) => void)?][] = [
    ['TC6-1-1', 'valid wallet', {}, true, (w) => { expect(Number(w.balance)).toBe(0); expect(w.color?.toUpperCase()).toBe('#3B82F6'); }],
    ['TC6-1-2', 'no color picked', { Color: null }, true],
    ['TC6-1-3', 'saving wallet with goal 20,000', { Saving: true, Goal: '20000' }, true, (w) => { expect(w.isSaving).toBe(true); expect(Number(w.goalAmount)).toBe(20000); }],
    ['TC6-1-4', 'hide balance ON', { HideBalance: true }, true],
    ['TC6-1-5', 'empty name', { Name: '' }, false],
    ['TC6-1-6', 'name of spaces only', { Name: '   ' }, false],
    ['TC6-1-8', 'name of 50 characters', { Name: long(50) }, true, (w) => expect(w.name).toHaveLength(50)],
    ['TC6-1-9', 'name already used', { Name: 'Main Bank' }, false],
    ['TC6-1-11', 'saving goal 0', { Saving: true, Goal: '0' }, false],
    ['TC6-1-12', 'saving goal empty', { Saving: true, Goal: '' }, false],
  ];
  for (const [id, what, change, created, check] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      if (id === 'TC6-1-4') test.skip(true, 'Hide Balance is not built yet');
      await openAs(page, u);
      const f = { ...base, ...change };
      try {
        const before = (await wallets(u)).length;
        await page.goto('/wallets');
        await page.getByRole('button', { name: 'Create Wallet' }).first().click();
        const d = page.getByRole('dialog');
        await d.waitFor();
        if (f.Name !== undefined) await d.getByLabel('Wallet Name').fill(f.Name);
        if (f.Color) await d.getByLabel(`Select color ${f.Color}`).click();
        if (f.Icon) await d.getByLabel(`Select ${f.Icon} icon`).click();
        if (f.Saving) {
          await d.getByRole('switch').first().click();
          if (f.Goal !== undefined) await d.getByLabel('Saving Goal (฿)').fill(f.Goal);
        }
        await page.waitForTimeout(800);
        if (f.HideBalance) await expect(d.getByText(/hide balance/i), 'Hide Balance option in the form').toBeVisible({ timeout: 3000 });
        await d.getByRole('button', { name: 'Create Wallet' }).click();
        expect(await closed(page), created ? 'created' : 'blocked (dialog stays open)').toBe(created);
        if (created) { await page.goto('/wallets'); await page.waitForTimeout(1500); }
        expect((await wallets(u)).length).toBe(before + (created ? 1 : 0));
        if (check) check(await wallet(u, f.Name!));
      } finally {
        await removeNew();
      }
    });
  }

  test('TC6-1-7 name of 51 characters', async ({ page }) => {
    await openAs(page, u);
    try {
      await page.goto('/wallets');
      await page.getByRole('button', { name: 'Create Wallet' }).first().click();
      const d = page.getByRole('dialog');
      await d.getByLabel('Wallet Name').fill(long(51));
      await page.waitForTimeout(800);
      await d.getByRole('button', { name: 'Create Wallet' }).click();
      await closed(page);
      await page.goto('/wallets');
      await page.waitForTimeout(1500);
      expect((await wallets(u)).map((w) => w.name.length)).not.toContain(51);
    } finally {
      await removeNew();
    }
  });

  test('TC6-1-10 color not #RRGGBB (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC6-1-10', u, 'POST', '/api/v1/wallets', { name: 'Travel Fund', color: 'blue' });
    expect(r.status).toBe(400);
    expect(await wallet(u, 'Travel Fund')).toBeUndefined();
  });
});

// ======================= US6-3 Mark wallet as Saving Wallet =======================
test.describe('US6-3 Mark wallet as Saving Wallet', () => {
  let u: User;
  let travel: string;
  let hm: string;
  test.beforeAll(async ({ playwright }) => {
    u = await newUser(playwright, 'Tester 6-3');
    travel = (await u.api('POST', '/api/v1/wallets', { name: 'Travel Fund' })).json.data.id;
    await u.api('POST', '/api/v1/transactions', { walletId: travel, type: 'income', amount: 12400, date: '2026-10-01', title: 'Savings in', categoryId: u.cat('Salary') });
    hm = await shareWith(u, guy, 'Housemate Fund');
  });
  test.beforeEach(async ({}, info) => {
    const startOn = info.title.startsWith('TC6-3-2');
    await u.api('PATCH', `/api/v1/wallets/${travel}/saving`, startOn ? { isSaving: true, goalAmount: 20000 } : { isSaving: false });
  });

  // [id, what, switch ON?, goal typed, saved?, isSaving afterwards]
  const cases: [string, string, boolean, string | undefined, boolean, boolean][] = [
    ['TC6-3-1', 'turn on with goal 20,000', true, '20000', true, true],
    ['TC6-3-2', 'turn off', false, undefined, true, false],
    ['TC6-3-3', 'goal 0', true, '0', false, false],
    ['TC6-3-4', 'negative goal', true, '-100', false, false],
    ['TC6-3-5', 'empty goal', true, '', false, false],
  ];
  for (const [id, what, on, goal, saved, after] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      await openAs(page, u);
      await walletMenu(page, 'Travel Fund', { item: 'Saving Goal Settings' });
      const d = page.getByRole('dialog');
      const sw = d.getByRole('switch');
      if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
      if (goal !== undefined) await d.getByLabel('Target Goal Amount (฿)').fill(goal);
      await page.waitForTimeout(800);
      await d.getByRole('button', { name: 'Save Goal' }).click();
      expect(await closed(page), saved ? 'saved' : 'blocked (dialog stays open)').toBe(saved);
      if (saved) { await page.goto('/wallets'); await page.getByText('Travel Fund').first().waitFor(); await page.waitForTimeout(1500); }
      expect((await wallet(u, 'Travel Fund')).isSaving).toBe(after);
      if (id === 'TC6-3-1') await expect(page.getByText('62%').first()).toBeVisible();
    });
  }

  test('TC6-3-6 Contributor cannot change it (UI + HTTP API)', async ({ page }) => {
    await asContributor(page, 'TC6-3-6', 'Saving Goal Settings', 'PATCH', `/api/v1/wallets/${hm}/saving`, { isSaving: true, goalAmount: 1000 });
    expect((await wallet(u, 'Housemate Fund')).isSaving).toBeFalsy();
  });

  test('TC6-3-7 wallet that does not exist (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC6-3-7', u, 'PATCH', '/api/v1/wallets/000000000000000000000000/saving', { isSaving: true, goalAmount: 20000 });
    expect(r.status).toBe(404);
  });
});

// ======================= US6-4 Delete wallet =======================
test.describe('US6-4 Delete wallet', () => {
  let u: User;
  let old: string;
  let rule: string;
  let hm: string;
  test.beforeAll(async ({ playwright }) => {
    u = await newUser(playwright, 'Tester 6-4');
    old = (await u.api('POST', '/api/v1/wallets', { name: 'Old Fund' })).json.data.id;
    for (let i = 1; i <= 5; i++) await u.api('POST', '/api/v1/transactions', { walletId: old, type: 'expense', amount: 10 * i, date: '2026-10-25', title: `Old ${i}`, categoryId: u.cat('Food & Drinks') });
    const sched = await u.api('POST', '/api/v1/schedulers', { walletId: old, categoryId: u.cat('Food & Drinks'), type: 'expense', amount: 99, title: 'Monthly fee', startDate: '2027-01-15', frequency: 'monthly', interval: 1, end: { type: 'never' } });
    expect(sched.status, 'recurring rule created').toBeLessThan(300);
    rule = sched.json.data.id;
    await u.api('POST', '/api/v1/wallets', { name: 'Empty Wallet' });
    hm = await shareWith(u, guy, 'Housemate Fund');
  });
  const oldTxns = async () => (await u.api('GET', '/api/v1/transactions?month=2026-10')).json?.data;

  const deleteVia = async (page: Page, name: string, confirm: boolean) => {
    await openAs(page, u);
    await walletMenu(page, name, { item: 'Delete Wallet' });
    await page.waitForTimeout(1000);
    await dialog(page).getByRole('button', { name: confirm ? 'Delete Wallet and Transactions' : 'Cancel' }).click();
    await closed(page);
    await page.goto('/wallets');
    await page.waitForTimeout(1500);
  };

  // Cancel is declared before the real delete so a worker that runs both cancels first.
  test('TC6-4-3 cancel the warning', async ({ page }) => {
    await deleteVia(page, 'Old Fund', false);
    expect(await wallet(u, 'Old Fund')).toBeDefined();
    expect(JSON.stringify(await oldTxns()).match(/"Old \d"/g)).toHaveLength(5);
  });

  test('TC6-4-1 delete a wallet with transactions and a recurring rule', async ({ page }) => {
    await deleteVia(page, 'Old Fund', true);
    expect(await wallet(u, 'Old Fund')).toBeUndefined();
    expect(JSON.stringify(await oldTxns())).not.toMatch(/"Old \d"/);
    const r = await u.api('GET', `/api/v1/schedulers/${rule}`);
    expect(r.status === 404 || r.json?.data?.status === 'cancelled', `recurring rule gone or cancelled (HTTP ${r.status} ${r.json?.data?.status})`).toBe(true);
  });

  test('TC6-4-2 delete a wallet with no transactions', async ({ page }) => {
    await deleteVia(page, 'Empty Wallet', true);
    expect(await wallet(u, 'Empty Wallet')).toBeUndefined();
  });

  test('TC6-4-4 Contributor cannot delete (UI + HTTP API)', async ({ page }) => {
    await asContributor(page, 'TC6-4-4', 'Delete Wallet', 'DELETE', `/api/v1/wallets/${hm}`);
    expect(await wallet(u, 'Housemate Fund')).toBeDefined();
  });

  test("TC6-4-5 another user's wallet (HTTP API)", async ({ page }) => {
    await openAs(page, u);
    const theirs = (await wallet(guy, 'Cash')).id;
    const r = await apiCall(page, 'TC6-4-5', u, 'DELETE', `/api/v1/wallets/${theirs}`);
    expect([403, 404]).toContain(r.status);
    expect(await wallet(guy, 'Cash')).toBeDefined();
  });

  test('TC6-4-6 wallet that does not exist (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC6-4-6', u, 'DELETE', '/api/v1/wallets/000000000000000000000000');
    expect(r.status).toBe(404);
  });
});

// ======================= US6-5 Edit wallet name and color =======================
test.describe('US6-5 Edit wallet name and color', () => {
  let u: User;
  let travel: string;
  let hm: string;
  const original = { name: 'Travel Fund', color: '#3B82F6', icon: 'Plane' };
  test.beforeAll(async ({ playwright }) => {
    u = await newUser(playwright, 'Tester 6-5');
    travel = (await u.api('POST', '/api/v1/wallets', original)).json.data.id;
    await u.api('POST', '/api/v1/wallets', { name: 'Main Bank' });
    hm = await shareWith(u, guy, 'Housemate Fund');
  });
  test.beforeEach(async () => { await u.api('PUT', `/api/v1/wallets/${travel}`, original); });
  const travelNow = async () => (await wallets(u)).find((w) => w.id === travel);

  // [id, what, name typed (undefined = unchanged), color picked, saved?, name afterwards, color afterwards]
  const cases: [string, string, string | undefined, string | undefined, boolean, string, string][] = [
    ['TC6-5-1', 'new name and color', 'Trip to Japan', '#E85C7D', true, 'Trip to Japan', '#E85C7D'],
    ['TC6-5-2', 'name only', 'Trip to Japan', undefined, true, 'Trip to Japan', '#3B82F6'],
    ['TC6-5-3', 'color only', undefined, '#E85C7D', true, 'Travel Fund', '#E85C7D'],
    ['TC6-5-4', 'empty name', '', '#E85C7D', false, 'Travel Fund', '#3B82F6'],
    ['TC6-5-5', 'name of spaces only', '   ', '#E85C7D', false, 'Travel Fund', '#3B82F6'],
    ['TC6-5-7', 'name already used', 'Main Bank', '#E85C7D', false, 'Travel Fund', '#3B82F6'],
  ];
  const edit = async (page: Page, name?: string, color?: string) => {
    await openAs(page, u);
    await walletMenu(page, 'Travel Fund', { item: 'Edit' });
    const d = page.getByRole('dialog');
    if (name !== undefined) await d.getByLabel('Wallet Name').fill(name);
    if (color) await d.getByLabel(`Select color ${color}`).click();
    await d.getByLabel('Select Travel icon').click();
    await page.waitForTimeout(800);
    await d.getByRole('button', { name: 'Save Changes' }).click();
    const saved = await closed(page);
    if (saved) { await page.goto('/wallets'); await page.waitForTimeout(1500); }
    return saved;
  };
  for (const [id, what, name, color, saved, nameAfter, colorAfter] of cases) {
    test(`${id} ${what}`, async ({ page }) => {
      expect(await edit(page, name, color), saved ? 'saved' : 'blocked (dialog stays open)').toBe(saved);
      const w = await travelNow();
      expect([w?.name, w?.color?.toUpperCase()]).toEqual([nameAfter, colorAfter]);
    });
  }

  test('TC6-5-6 name of 51 characters', async ({ page }) => {
    await edit(page, 'E'.repeat(51), '#E85C7D');
    expect((await travelNow())?.name).not.toHaveLength(51);
  });

  test('TC6-5-8 color not #RRGGBB (HTTP API)', async ({ page }) => {
    await openAs(page, u);
    const r = await apiCall(page, 'TC6-5-8', u, 'PUT', `/api/v1/wallets/${travel}`, { color: 'red' });
    expect(r.status).toBe(400);
    expect((await travelNow())?.color?.toUpperCase()).toBe('#3B82F6');
  });

  test('TC6-5-9 Contributor cannot edit (UI + HTTP API)', async ({ page }) => {
    await asContributor(page, 'TC6-5-9', 'Edit', 'PUT', `/api/v1/wallets/${hm}`, { name: 'Hijacked' });
    expect(await wallet(u, 'Housemate Fund')).toBeDefined();
  });
});
