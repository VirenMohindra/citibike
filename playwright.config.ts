import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Enable parallel execution for faster test runs
  fullyParallel: true,

  // Prevent committed test.only() from blocking CI
  forbidOnly: !!process.env.CI,

  // Retry flaky tests in CI
  retries: process.env.CI ? 2 : 0,

  // Use optimal number of workers
  // CI: Use 50% of available cores for stability
  // Local: Use all available cores for speed
  workers: process.env.CI ? '50%' : undefined,

  // Better reporting in CI
  reporter: process.env.CI ? [['html'], ['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:3000',

    // Capture trace only on retry to save time
    trace: 'on-first-retry',

    // Only capture media on failure to reduce artifact size
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Shorter timeouts for faster feedback
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Global timeout to prevent hanging tests
  timeout: 30 * 1000,

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use headless mode in CI for performance
        headless: true,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Suppress dev server logs in test output
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
