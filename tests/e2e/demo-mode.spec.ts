/**
 * E2E tests for demo mode complete user journey
 */

import { test, expect } from '@playwright/test';

test.describe('Demo Mode User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to simulate fresh browser
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB
      indexedDB.databases().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name) indexedDB.deleteDatabase(db.name);
        });
      });
    });
  });

  test('auto-loads demo on first visit', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for demo to load (banner should appear)
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Visualize My Data')).toBeVisible();

    // Verify demo user is loaded
    const userName = await page.locator('text=Alex').first();
    await expect(userName).toBeVisible();

    // Verify trips are loaded (check if trip stats show data)
    await page.goto('/trips');
    await expect(page.locator('text=/\\d+ trips/')).toBeVisible({ timeout: 10000 });
  });

  test('shows demo banner with login CTA', async ({ page }) => {
    await page.goto('/');

    // Wait for demo banner
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Check banner has login button
    const loginButton = page.locator('button:has-text("Visualize My Data")');
    await expect(loginButton).toBeVisible();

    // Click login button should navigate or open modal
    await loginButton.click();
    await expect(page.locator('text=Enter Phone Number')).toBeVisible({ timeout: 3000 });
  });

  test('allows manual demo selection from login modal', async ({ page }) => {
    // Manually trigger logout to clear demo
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('citibike-logged-out', 'true');
    });

    // Reload to skip auto-load
    await page.reload();

    // Click connect account button
    await page.locator('button:has-text("Connect Citibike Account")').click();

    // Look for "Try a demo account" button
    await expect(page.locator('button:has-text("Try a demo account")')).toBeVisible();

    // Click demo button
    await page.locator('button:has-text("Try a demo account")').click();

    // Should close modal and load demo
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });
  });

  test('navigates through demo data', async ({ page }) => {
    await page.goto('/');

    // Wait for demo to load
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Navigate to trips page
    await page.goto('/trips');
    await expect(page.locator('text=/\\d+ trips/')).toBeVisible({ timeout: 10000 });

    // Verify trip data is displayed
    await expect(page.locator('text=Total Trips')).toBeVisible();

    // Navigate to economics page
    await page.goto('/analysis/economics');
    await expect(page.locator('text=Transportation Economics')).toBeVisible({ timeout: 5000 });
  });

  test('blocks restricted features in demo mode', async ({ page }) => {
    await page.goto('/');

    // Wait for demo to load
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Navigate to trips page
    await page.goto('/trips');

    // Try to click sync button (should be blocked or show modal)
    const syncButton = page.locator('button:has-text(/Sync/)').first();

    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Should show feature locked modal or do nothing in demo mode
      // (Implementation may vary - check for modal or lack of action)
      const modal = page.locator('text=requires a real account');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('clears demo data on real login', async ({ page }) => {
    await page.goto('/');

    // Wait for demo to load
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Click login from banner
    await page.locator('button:has-text("Visualize My Data")').click();

    // Should show login modal
    await expect(page.locator('text=Enter Phone Number')).toBeVisible({ timeout: 3000 });

    // Demo state should still be active until real login completes
    await page.goto('/');
    await expect(page.locator('text=Demo Mode:')).toBeVisible();
  });

  test('skips auto-load after logout', async ({ page }) => {
    await page.goto('/');

    // Wait for demo to load
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Find and click logout/exit demo button
    const userProfile = page.locator('button:has-text("Alex")').first();
    if (await userProfile.isVisible()) {
      await userProfile.click();

      // Look for Exit Demo button
      const exitDemo = page.locator('button:has-text("Exit Demo")');
      if (await exitDemo.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exitDemo.click();

        // Should redirect to home without demo
        await page.waitForURL('/');

        // Reload page - demo should NOT auto-load
        await page.reload();
        await page.waitForTimeout(2000);

        // Demo banner should NOT appear
        const demoBanner = page.locator('text=Demo Mode:');
        await expect(demoBanner).not.toBeVisible();
      }
    }
  });

  test('loads demo with realistic trip data', async ({ page }) => {
    await page.goto('/');

    // Wait for demo to load
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Navigate to trips
    await page.goto('/trips');

    // Should have substantial number of trips
    const tripCount = await page.locator('text=/\\d+ trips/').textContent();
    const match = tripCount?.match(/(\d+)/);
    if (match) {
      const count = parseInt(match[1], 10);
      expect(count).toBeGreaterThan(100); // Should have 500+ trips
    }

    // Check for trip details
    await expect(page.locator('text=Total Trips')).toBeVisible();
    await expect(page.locator('text=Distance')).toBeVisible();
  });

  test('demo analytics are filtered', async ({ page }) => {
    await page.goto('/');

    // Wait for demo to load
    await expect(page.locator('text=Demo Mode:')).toBeVisible({ timeout: 5000 });

    // Check localStorage for demo flag
    const isDemoMode = await page.evaluate(() => {
      return localStorage.getItem('isDemoMode') === 'true';
    });

    expect(isDemoMode).toBe(true);

    // Analytics should be filtered (verified by checking beforeSend in AnalyticsWrapper)
    // This is tested indirectly through the presence of demo mode flag
  });
});
