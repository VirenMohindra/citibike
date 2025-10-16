/**
 * Playwright Test Fixture with Automatic Coverage Collection
 *
 * This fixture extends the base Playwright test to automatically:
 * - Start JS and CSS coverage before each test
 * - Stop coverage and save results after each test
 *
 * Usage:
 * import { test, expect } from '../fixtures/coverage';
 *
 * test('my test', async ({ page }) => {
 *   // Coverage is automatically collected
 * });
 */

import { test as base, expect } from '@playwright/test';
import { startCoverage, stopCoverage } from '../coverage-helper';

type CoverageFixtures = {
  autoTestFixture: string;
};

export const test = base.extend<CoverageFixtures>({
  autoTestFixture: [
    async ({ page }, use, testInfo) => {
      // Start coverage before test
      await startCoverage(page).catch((err) => {
        console.warn(`Failed to start coverage for ${testInfo.title}:`, err.message);
      });

      // Run the test
      await use('');

      // Stop coverage after test (even if test failed)
      await stopCoverage(page, testInfo.title).catch((err) => {
        console.warn(`Failed to stop coverage for ${testInfo.title}:`, err.message);
      });
    },
    { auto: true }, // Automatically run for every test
  ],
});

// Re-export all Playwright test utilities
export { expect };
export const describe = base.describe;
