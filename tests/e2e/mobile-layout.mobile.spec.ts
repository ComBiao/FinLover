import { expect, test, type Page } from '@playwright/test';
import { login, register, uniqueEmail } from './helpers';

// Runs in the `mobile` Playwright project only (iPhone-sized viewport).

const PRIVATE_PAGES = ['/homepage', '/transactions', '/wallets', '/category', '/recurring', '/profile'];

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(0);
}

test('auth pages fit the phone and have no app navigation', async ({ page }) => {
  for (const path of ['/login', '/register']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test('private pages use the bottom bar, fit the screen, and More opens a sheet', async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email, 'Mobile Tester');
  await expect(page).toHaveURL(/registered=1/, { timeout: 30_000 });
  await login(page, email);
  await expect(page).toHaveURL(/\/homepage$/);

  const bottomNav = page.getByRole('navigation', { name: 'Mobile' });
  const sidebar = page.getByRole('navigation', { name: 'Main' });

  for (const path of PRIVATE_PAGES) {
    await page.goto(path);
    await expect(bottomNav).toBeVisible();
    await expect(sidebar).toBeHidden();
    await expectNoHorizontalScroll(page);
  }

  // More sheet: Category / Reports / Account.
  await page.goto('/homepage');
  await bottomNav.getByRole('button', { name: 'More' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('link', { name: 'Category' })).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Reports' })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Account/ })).toBeVisible();
  await sheet.getByRole('link', { name: 'Category' }).click();
  await expect(page).toHaveURL(/\/category$/);

  // The floating button opens Add Transaction as a bottom sheet; the header button is hidden on phones.
  await page.goto('/transactions');
  await expect(page.getByRole('button', { name: 'Add Transaction' })).toBeHidden();
  await page.getByRole('button', { name: 'New transaction' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && Math.round(box.y + box.height)).toBe(viewport?.height);
  expect(box?.width).toBe(viewport?.width);
});
