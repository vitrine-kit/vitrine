import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.DEMO_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Do not start a webServer here — the smoke suite targets an already-running
  // zero-config client (DEMO_URL). CI can spin the demo up separately.
});
