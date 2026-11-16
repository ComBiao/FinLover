// Shared steps for the Epic 3 / Epic 6 test-plan specs. Each case is its own test, so each gets its own video.
import { expect, test, type APIRequestContext, type Page, type PlaywrightWorkerArgs, type TestInfo } from '@playwright/test';
import path from 'node:path';
import { password, uniqueEmail } from '../helpers';

export const ORIGIN = `http://localhost:${process.env.E2E_PORT ?? '3000'}`;
const VIDEO_DIR = path.join('test-results', 'test-plan-videos');

/** Video for every case, saved as test-results/test-plan-videos/<case id>.webm. */
export function recordVideos() {
  test.use({ video: { mode: 'on', size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 } });
  // Cases spread over workers; each worker's beforeAll builds its own users and data, so they don't share state.
  test.describe.configure({ mode: 'parallel', timeout: 180_000 });
  test.afterEach(async ({ page }, info: TestInfo) => {
    const video = page.video();
    await page.close();
    await video?.saveAs(path.join(VIDEO_DIR, `${info.title.split(' ')[0]}.webm`));
  });
}

// API responses are loosely shaped JSON; the tests read only a few fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;
export type Api = { status: number; json: Json };
export type User = { name: string; email: string; req: APIRequestContext; api: (method: string, url: string, body?: unknown) => Promise<Api>; cat: (name: string) => string };

const arr = (x: Json): Json[] => (Array.isArray(x) ? x : x?.items ?? x?.transactions ?? []);

/** Registers and logs in through the API; the returned request context carries the session cookie. */
export async function newUser(playwright: PlaywrightWorkerArgs['playwright'], name: string): Promise<User> {
  const req = await playwright.request.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Origin: ORIGIN } });
  const email = uniqueEmail();
  const reg = await req.post('/api/v1/auth/register', { data: { name, email, password, confirmPassword: password, dataPrivacyConsent: true } });
  expect(reg.status(), 'register').toBeLessThan(300);
  const login = await req.post('/api/v1/auth/login', { data: { email, password } });
  expect(login.status(), 'login').toBeLessThan(300);
  const api = async (method: string, url: string, body?: unknown): Promise<Api> => {
    const res = await req.fetch(url, { method, ...(body === undefined ? {} : { data: body }) });
    return { status: res.status(), json: await res.json().catch(() => null) };
  };
  const cats = arr((await api('GET', '/api/v1/categories')).json?.data);
  return { name, email, req, api, cat: (n) => cats.find((c) => c.name === n)?.id };
}

/** Logs the browser in as `user` and pins the browser clock to 29 Oct 2026 so the default period is October 2026. */
export async function openAs(page: Page, user: User) {
  await page.context().addCookies((await user.req.storageState()).cookies);
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00+07:00'));
}

export const wallets = async (u: User) => arr((await u.api('GET', '/api/v1/wallets')).json?.data);
export const wallet = async (u: User, name: string) => (await wallets(u)).find((w) => w.name === name);
export const balance = async (u: User, name: string) => Number((await wallet(u, name))?.balance);
export const transactions = async (u: User) => arr((await u.api('GET', '/api/v1/transactions?month=2026-10')).json?.data);

/** Shows an API request and its response on screen so API-only cases have something to watch in the video. */
export async function showApi(page: Page, title: string, who: string, method: string, url: string, body: unknown, r: Api) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await page.setContent(`<div style="font:15px/1.5 Consolas,monospace;padding:24px;color:#111">
    <div style="font:600 18px Segoe UI,sans-serif;margin-bottom:10px">${esc(title)} - HTTP API</div>
    <div><b>Session:</b> ${esc(who)}</div><div><b>Request:</b> ${method} ${esc(url)}</div>
    ${body === undefined ? '' : `<div><b>Body:</b> ${esc(JSON.stringify(body))}</div>`}
    <div style="margin-top:10px"><b>Response:</b> <span style="color:${r.status < 300 ? '#15803d' : '#b91c1c'}">HTTP ${r.status}</span></div>
    <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:6px">${esc(JSON.stringify(r.json, null, 2) ?? '(no body)')}</pre></div>`);
  await page.waitForTimeout(1500);
}

/** Calls the API as `user` and shows the call in the video. */
export async function apiCall(page: Page, title: string, user: User, method: string, url: string, body?: unknown) {
  const r = await user.api(method, url, body);
  await showApi(page, title, user.name, method, url, body, r);
  return r;
}

// ---------- dialogs ----------
export const dialog = (p: Page) => p.getByRole('dialog').or(p.getByRole('alertdialog'));
/** Waits for a dialog to close; returns false if it is still open (the save was blocked). */
export async function closed(p: Page) {
  const ok = await dialog(p).waitFor({ state: 'hidden', timeout: 6000 }).then(() => true, () => false);
  await p.waitForTimeout(500);
  return ok;
}

// ---------- transactions ----------
/** Form values: a string is typed (''= cleared), null leaves the field as the form shows it. */
export type TxnFields = Partial<Record<'Type' | 'Amount' | 'Date' | 'Title' | 'Wallet' | 'Category' | 'Note', string | null>>;

export const searchBox = (p: Page) => p.locator('input[placeholder="Search by title or note"]:visible');

export async function openTransactions(p: Page, search?: string) {
  await p.goto('/transactions');
  await p.evaluate(() => { try { sessionStorage.clear(); } catch { /* ignore */ } });
  await p.reload();
  await p.getByRole('button', { name: 'Add Transaction' }).waitFor();
  await p.waitForTimeout(1500);
  if (search) { await searchBox(p).fill(search); await p.waitForTimeout(1800); }
}

export const rowTitles = async (p: Page) =>
  (await p.locator('tbody tr').allInnerTexts()).map((r) => r.split(/\t|\n/).map((s) => s.trim()).filter(Boolean)).filter((c) => c.length > 1).map((c) => c[1]);

async function fillTxn(p: Page, f: TxnFields) {
  const d = p.getByRole('dialog');
  const types = d.getByRole('radiogroup', { name: 'Transaction type' });
  if (f.Type) await types.getByRole('radio', { name: f.Type, exact: true }).click();
  const income = (await types.getByRole('radio', { checked: true }).innerText()).includes('Income');
  if (f.Amount != null) {
    const amount = d.getByLabel(income ? 'Money in' : 'Money out');
    // A number input refuses fill('abc'); typing it key by key shows what a user would see.
    await amount.fill(f.Amount).catch(async () => { await amount.fill(''); await amount.pressSequentially(f.Amount!); });
  }
  if (f.Title != null) await d.getByLabel('Title').fill(f.Title);
  if (f.Date != null) await d.getByLabel('Date').fill(f.Date);
  if (f.Wallet != null) {
    await d.getByLabel(income ? 'Deposit to wallet' : 'Pay from wallet').click();
    await p.getByRole('option', { name: new RegExp('^' + f.Wallet) }).first().click();
  }
  if (f.Category != null) await d.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: f.Category, exact: true }).click();
  if (f.Note != null) await d.getByLabel('Note').fill(f.Note);
}

/** Adds (or edits the row titled `edit`) through the dialog and clicks Save. Returns whether the dialog closed. */
export async function saveTxn(p: Page, f: TxnFields, edit?: string) {
  await openTransactions(p, edit);
  if (edit) {
    await p.locator('tbody tr').filter({ hasText: edit }).first().getByRole('button', { name: 'Transaction actions' }).click();
    await p.getByRole('menuitem', { name: 'Edit' }).click();
  } else {
    await p.getByRole('button', { name: 'Add Transaction' }).click();
  }
  const d = p.getByRole('dialog');
  await d.waitFor();
  await fillTxn(p, f);
  await p.waitForTimeout(800);
  const income = (await d.getByRole('radiogroup', { name: 'Transaction type' }).getByRole('radio', { checked: true }).innerText()).includes('Income');
  await d.getByRole('button', { name: edit ? 'Save changes' : `Save ${income ? 'income' : 'expense'}` }).click();
  const saved = await closed(p);
  if (saved) await openTransactions(p, (f.Title || edit)?.slice(0, 100));
  else await p.waitForTimeout(1000);
  return saved;
}

export const categoryOf = async (u: User, title: string) => {
  const t = (await transactions(u)).find((x) => x.title === title);
  const cats = arr((await u.api('GET', '/api/v1/categories')).json?.data);
  return { txn: t, category: cats.find((c) => c.id === t?.categoryId)?.name as string | undefined };
};

export async function removeTxns(u: User, title: string) {
  for (const t of await transactions(u)) if (t.title === title) await u.api('DELETE', `/api/v1/transactions/${t.id}`);
}

// ---------- wallets ----------
export async function walletMenu(p: Page, name: string, { shared = false, item }: { shared?: boolean; item?: string } = {}) {
  await p.goto('/wallets');
  if (shared) await p.getByRole('tab', { name: /Shared/ }).click();
  await p.getByText(name, { exact: true }).first().waitFor();
  await p.waitForTimeout(800);
  const card = p.locator('div').filter({ has: p.getByText(name, { exact: true }) }).filter({ has: p.getByRole('button', { name: 'Wallet actions' }) }).last();
  await card.getByRole('button', { name: 'Wallet actions' }).click();
  await p.getByRole('menu').waitFor();
  const items = (await p.getByRole('menuitem').allInnerTexts()).map((s) => s.trim());
  await p.waitForTimeout(800);
  if (item) {
    await p.getByRole('menuitem', { name: item }).click();
    await dialog(p).waitFor();
  }
  return items;
}

/** Creates a shared wallet owned by `owner` with `member` as an accepted Contributor. */
export async function shareWith(owner: User, member: User, name: string) {
  const id = (await owner.api('POST', '/api/v1/wallets', { name, isShared: true })).json?.data?.id as string;
  const sent = await owner.api('POST', `/api/v1/wallets/${id}/invitations`, { email: member.email });
  expect(sent.status, 'invite').toBeLessThan(300);
  for (const inv of arr((await member.api('GET', '/api/v1/invitations')).json?.data)) await member.api('POST', `/api/v1/invitations/${inv.id}/accept`);
  return id;
}
