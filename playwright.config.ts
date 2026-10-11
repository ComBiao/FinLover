import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '3100';

export default defineConfig({
  testDir: './tests/e2e',
  // `next dev` compiles each route on first use, so the first requests of a run are slow.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node tests/e2e/start-server.mjs',
    url: `http://localhost:${port}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { E2E_PORT: port },
  },
});
