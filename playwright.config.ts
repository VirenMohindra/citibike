import { defineConfig, devices } from '@playwright/test';

// Centralized timeout configuration
const TIMEOUTS = {
  // Test execution timeouts
  test: 60 * 1000, // 60s - global test timeout (allows for map + interactions)
  action: 30 * 1000, // 30s - individual action timeout (marker clicks need time to become interactive)
  navigation: 30 * 1000, // 30s - page navigation timeout

  // WebGL/Canvas loading (for Mapbox in CI)
  canvas: 30 * 1000, // 30s - wait for .mapboxgl-canvas to render
  marker: 30 * 1000, // 30s - wait for .marker elements to be interactive

  // Server startup
  webServer: 120 * 1000, // 120s (2 min) - dev server startup in CI
} as const;

// Export for use in test files
export { TIMEOUTS };

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

    // Reasonable timeouts for CI
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
  },

  // Global timeout to prevent hanging tests (increased for CI map loading)
  timeout: TIMEOUTS.test,

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use headless mode in CI for performance
        headless: true,
        // Enable WebGL for Mapbox GL JS in CI headless Chrome
        // Local tests don't need these flags (they can use system GPU)
        ...(process.env.CI && {
          launchOptions: {
            args: [
              '--use-gl=swiftshader', // Software-based GL for headless CI
              '--enable-webgl',
              '--enable-accelerated-2d-canvas',
              '--disable-gpu', // Disable GPU hardware acceleration (use SwiftShader instead)
            ],
          },
        }),
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: TIMEOUTS.webServer,
    // Show server logs in CI to debug issues
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: 'pipe',
    // Pass environment variables to dev server
    env: {
      // CI sets this via GitHub secrets, local uses .env.local
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
    },
  },
});
