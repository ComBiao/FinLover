import { expect, test, type Page } from '@playwright/test';
import { login, password, register, uniqueEmail } from './helpers';

type Wallet = { id: string; name: string; balance: number };

const wallets = async (page: Page) =>
  ((await (await page.request.get('/api/v1/wallets')).json()).data as Wallet[]);

async function addTransaction(page: Page, opts: { type: 'Expense' | 'Income'; title: string; amount: string; category: string }) {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add Transaction' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: opts.type }).click();
  await dialog.getByLabel(opts.type === 'Expense' ? 'Money out' : 'Money in').fill(opts.amount);
  await dialog.getByLabel('Title').fill(opts.title);
  await dialog.getByLabel(opts.type === 'Expense' ? 'Pay from wallet' : 'Deposit to wallet').click();
  await page.getByRole('option').first().click();
  await dialog.getByRole('radio', { name: opts.category }).click();
  await dialog.getByRole('button', { name: `Save ${opts.type.toLowerCase()}` }).click();
  await expect(dialog).toBeHidden();
}

test('whole app: wallet, categories, transactions, profile, delete account', async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email, 'Alex Tester');
  await expect(page).toHaveURL(/registered=1/);
  await login(page, email);
  await expect(page).toHaveURL(/\/homepage$/);

  // Home greets the real user, not a hard-coded name.
  await expect(page.getByText('Alex Tester').first()).toBeVisible();

  // --- Wallet -------------------------------------------------------------
  await page.goto('/wallets');
  await page.getByRole('button', { name: 'Create Wallet' }).first().click();
  await page.getByLabel('Wallet Name').fill('Daily');
  await page.getByRole('dialog').getByRole('button', { name: 'Create Wallet' }).click();
  await expect(page.getByText('Daily').first()).toBeVisible();
  expect((await wallets(page)).map((w) => w.name)).toEqual(['Daily']);

  // --- Categories ---------------------------------------------------------
  await page.goto('/category');
  // Seeded defaults come from the server, with the fallback last.
  await expect(page.getByText('Food & Drinks')).toBeVisible();
  await expect(page.getByText('Others')).toBeVisible();

  await page.getByRole('button', { name: 'Add new category' }).click();
  await page.getByLabel('Name').fill('Coffee');
  await page.getByRole('button', { name: 'Create Category' }).click();
  await expect(page.getByText('Coffee')).toBeVisible();

  // Duplicate names are rejected by the server and shown inline.
  await page.getByRole('button', { name: 'Add new category' }).click();
  await page.getByLabel('Name').fill('Coffee');
  await page.getByRole('button', { name: 'Create Category' }).click();
  await expect(page.getByText(/already exists/i)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Edit the custom category; system ones are not clickable.
  await page.getByRole('button', { name: /Coffee/ }).click();
  await page.getByLabel('Name').fill('Coffee & Tea');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Coffee & Tea')).toBeVisible();
  await expect(page.getByText('Food & Drinks')).toBeVisible();

  // --- Transactions & balances -------------------------------------------
  await addTransaction(page, { type: 'Income', title: 'Pay day', amount: '1000', category: 'Salary' });
  await addTransaction(page, { type: 'Expense', title: 'Latte', amount: '120', category: 'Coffee & Tea' });
  await expect(page.getByRole('row', { name: /Latte/ })).toContainText('Coffee & Tea');
  expect((await wallets(page))[0].balance).toBe(880);

  // Edit the expense: 120 -> 200.
  await page.getByRole('button', { name: 'Transaction actions' }).first().click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByLabel('Money out').fill('200');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(async () => (await wallets(page))[0].balance).toBe(800);

  // Wallets and Home show the same balance and totals.
  await page.goto('/wallets');
  await expect(page.getByText('฿800').first()).toBeVisible();

  await page.goto('/homepage');
  await expect(page.getByText('฿800').first()).toBeVisible();
  await expect(page.getByText(/Spent in/i)).toBeVisible();
  await expect(page.getByText('฿200').first()).toBeVisible();
  await expect(page.getByText('฿1,000').first()).toBeVisible();

  // Deleting a category keeps its transactions, now uncategorized.
  await page.goto('/category');
  await page.getByRole('button', { name: /Coffee & Tea/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  await page.getByRole('dialog').filter({ hasText: 'Delete Category' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Coffee & Tea')).toBeHidden();
  await page.goto('/transactions');
  await expect(page.getByRole('row', { name: /Latte/ })).toContainText('Uncategorized');
  expect((await wallets(page))[0].balance).toBe(800);

  // Delete the remaining transactions: balance returns to zero.
  for (const title of ['Latte', 'Pay day']) {
    await page.getByRole('row', { name: new RegExp(title) }).getByRole('button', { name: 'Transaction actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row', { name: new RegExp(title) })).toHaveCount(0);
  }
  await expect.poll(async () => (await wallets(page))[0].balance).toBe(0);

  // --- Profile & delete account ------------------------------------------
  await page.goto('/profile');
  await expect(page.getByTestId('profile-name')).toHaveText('Alex Tester');
  await expect(page.getByTestId('profile-email')).toHaveText(email);

  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, email);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('private pages and API reject anonymous visitors', async ({ page }) => {
  for (const path of ['/homepage', '/transactions', '/wallets', '/category', '/profile']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  for (const path of ['/api/v1/wallets', '/api/v1/categories', '/api/v1/auth/me', '/api/v1/transactions']) {
    expect((await page.request.get(path)).status()).toBe(401);
  }
});

test('a session that ends mid-use sends the user back to /login', async ({ page, context }) => {
  const email = uniqueEmail();
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/homepage$/);

  await context.clearCookies();
  await page.getByRole('link', { name: /Wallets/ }).first().click();
  await expect(page).toHaveURL(/\/login/);
  expect(password).toBeTruthy();
});
