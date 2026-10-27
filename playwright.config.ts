import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '3000';

export default defineConfig({
  testDir: './tests/e2e',
  // `next dev` compiles each route on first use, so the first requests of a run are slow.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', testIgnore: /.*\.mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    // iPhone-sized viewport (Chromium engine) for the mobile layout specs: `*.mobile.spec.ts` only.
    { name: 'mobile', testMatch: /.*\.mobile\.spec\.ts/, use: { ...devices['iPhone 14'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node tests/e2e/start-server.mjs',
    url: `http://localhost:${port}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { E2E_PORT: port },
  },
});
