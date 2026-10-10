import type { Page } from '@playwright/test';

export const password = 'Password123!';
export const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

export async function register(page: Page, email: string, name = 'E2E User') {
  await page.goto('/register');
  await page.getByLabel('Full Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
}

export async function login(page: Page, email: string, pw = password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(pw);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}
