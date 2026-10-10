import { expect, test } from '@playwright/test';
import { login, password, register, uniqueEmail } from './helpers';

test('root redirects anonymous visitors to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in to Finlover' })).toBeVisible();
});

test('register form validates before submitting', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);

  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill('Different123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Passwords do not match')).toBeVisible();
});

test('register -> login -> logout -> protected page is closed', async ({ page }) => {
  const email = uniqueEmail();

  await register(page, email);
  await expect(page).toHaveURL(/\/login\?registered=1$/);
  await expect(page.getByText('Account created successfully')).toBeVisible();

  await login(page, email);
  await expect(page).toHaveURL(/\/homepage$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === 'session_token');
  expect(session?.httpOnly).toBe(true);

  // Logged-in users are bounced away from the auth pages.
  await page.goto('/login');
  await expect(page).toHaveURL(/\/homepage$/);

  await page.getByRole('button', { name: /e2e user/i }).click({ force: true });
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  expect((await page.context().cookies()).find((c) => c.name === 'session_token')).toBeUndefined();

  await page.goto('/homepage');
  await expect(page).toHaveURL(/\/login/);
});

test('login rejects a wrong password and unknown email', async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email);
  await expect(page).toHaveURL(/registered=1/);

  await login(page, email, 'WrongPassword1!');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await login(page, uniqueEmail());
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('duplicate registration is rejected', async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email);
  await expect(page).toHaveURL(/registered=1/);

  await register(page, email);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});

test('API: cross-origin login is refused and has no session cookie', async ({ request, baseURL }) => {
  const res = await request.post('/api/v1/auth/login', {
    data: { email: 'a@example.com', password },
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
  });
  expect(res.ok()).toBe(false);
  expect(res.headers()['set-cookie'] ?? '').not.toContain('session_token');
  expect(baseURL).toBeTruthy();
});

test('API: invalid Authorization header is rejected even with a valid cookie', async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/homepage$/);

  const res = await page.request.get('/api/v1/wallets', {
    headers: { Authorization: 'Bearer not-a-real-token' },
  });
  expect(res.status()).toBe(401);
});
