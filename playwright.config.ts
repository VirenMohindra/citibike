import { defineConfig, devices } from '@playwright/test';

// Centralized timeout configuration
const TIMEOUTS = {
  // Test execution timeouts (optimized for speed while maintaining stability)
  test: 30 * 1000, // 30s - global test timeout (most tests finish in <10s)
  action: 60 * 1000, // 60s - individual action timeout (actions rarely take >30s)
  navigation: 15 * 1000, // 15s - page navigation timeout (domcontentloaded is fast)

  // WebGL/Canvas loading (for Mapbox in CI) - faster with modern Chrome flags
  canvas: 15 * 1000, // 15s - wait for .mapboxgl-canvas to render
  marker: 15 * 1000, // 15s - wait for .marker elements to be interactive

  // Server startup
  webServer: 90 * 1000, // 90s - dev server startup in CI
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
  // CI: Use 2 workers for faster execution (stable with modern Chrome flags + domcontentloaded)
  // Local: Use all available cores for speed
  workers: process.env.CI ? 2 : undefined,

  // Better reporting in CI
  reporter: process.env.CI ? [['html'], ['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:3000',

    // Capture trace only on retry to save time
    trace: 'on-first-retry',

    // Only capture media on failure to reduce artifact size and speed up tests
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'off' : 'retain-on-failure', // Disable video in CI for speed

    // Optimized timeouts
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
        // Disable animations in CI for faster tests
        ...(process.env.CI && {
          extraHTTPHeaders: {
            'Sec-CH-Prefers-Reduced-Motion': 'reduce',
          },
        }),
        // Enable WebGL for Mapbox GL JS in CI headless Chrome
        // Using modern Chrome flags (2025) for proper WebGL/Mapbox rendering
        // Reference: https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/
        ...(process.env.CI && {
          launchOptions: {
            args: [
              '--use-angle=gl', // Modern ANGLE GL backend for hardware-accelerated WebGL
              '--no-sandbox', // Required for containerized CI environments
              '--enable-webgl', // Enable WebGL support
              '--enable-accelerated-2d-canvas', // Enable hardware-accelerated canvas
              '--disable-blink-features=AutomationControlled', // Make tests more realistic
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
    // Pass environment variables to dev server in CI only
    // Locally, Next.js will load from .env.local automatically
    ...(process.env.CI && {
      env: {
        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    }),
  },
});
