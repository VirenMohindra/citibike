/**
 * Coverage Helper for Playwright Tests
 * Enables V8 coverage collection and reporting
 */

import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const COVERAGE_DIR = path.join(process.cwd(), '.nyc_output');
const COVERAGE_REPORT_DIR = path.join(process.cwd(), 'coverage');

/**
 * Start coverage collection for a page
 */
export async function startCoverage(page: Page): Promise<void> {
  await page.coverage.startJSCoverage({
    resetOnNavigation: false,
    reportAnonymousScripts: true,
  });

  await page.coverage.startCSSCoverage({
    resetOnNavigation: false,
  });
}

/**
 * Stop coverage collection and save results
 */
export async function stopCoverage(page: Page, testName: string): Promise<void> {
  const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage(),
  ]);

  // Ensure coverage directory exists
  if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  }

  // Save JS coverage
  const jsCoveragePath = path.join(
    COVERAGE_DIR,
    `js-coverage-${testName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`
  );

  fs.writeFileSync(jsCoveragePath, JSON.stringify(jsCoverage, null, 2));

  // Save CSS coverage
  const cssCoveragePath = path.join(
    COVERAGE_DIR,
    `css-coverage-${testName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`
  );

  fs.writeFileSync(cssCoveragePath, JSON.stringify(cssCoverage, null, 2));
}

interface CoverageEntry {
  text: string;
  ranges: Array<{ start: number; end: number }>;
}

/**
 * Get coverage summary statistics
 */
export function getCoverageSummary(coverageData: CoverageEntry[]): {
  totalBytes: number;
  usedBytes: number;
  percentCovered: number;
} {
  let totalBytes = 0;
  let usedBytes = 0;

  for (const entry of coverageData) {
    totalBytes += entry.text.length;

    for (const range of entry.ranges) {
      usedBytes += range.end - range.start;
    }
  }

  const percentCovered = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  return {
    totalBytes,
    usedBytes,
    percentCovered: Math.round(percentCovered * 100) / 100,
  };
}

/**
 * Clean up old coverage files
 */
export function cleanCoverageDir(): void {
  if (fs.existsSync(COVERAGE_DIR)) {
    fs.rmSync(COVERAGE_DIR, { recursive: true, force: true });
  }

  if (fs.existsSync(COVERAGE_REPORT_DIR)) {
    fs.rmSync(COVERAGE_REPORT_DIR, { recursive: true, force: true });
  }
}
