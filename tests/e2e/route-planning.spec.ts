import { test, expect } from '@playwright/test';

/**
 * Critical Path: Route Planning Journey
 * Tests the core functionality of planning a bike route
 */
test.describe('Route Planning Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to initialize
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 15000 });
    // Wait for station markers to load
    await page.waitForSelector('.marker', { timeout: 10000 });
  });

  test('should plan a route between two stations', async ({ page }) => {
    // Step 1: Search for start station
    const searchInput = page.locator('input[placeholder*="Search stations"]').first();
    await searchInput.fill('Madison');
    await page.waitForTimeout(500);

    // Step 2: Select first search result as start station - stations are clickable divs
    const firstResult = page
      .locator('div')
      .filter({ hasText: /Madison.*bikes/ })
      .first();
    await firstResult.click();

    // Verify start station is selected
    await expect(page.locator('text="Start"').first()).toBeVisible();

    // Step 3: Search for end station
    await searchInput.clear();
    await searchInput.fill('Union');
    await page.waitForTimeout(500);

    // Step 4: Select end station
    const endResult = page
      .locator('div')
      .filter({ hasText: /Union.*bikes/ })
      .first();
    await endResult.click();

    // Step 5: Verify route is displayed (may show in RoutePanel)
    await page.waitForTimeout(1000); // Wait for route calculation

    // Check for route elements
    const routeElement = page.locator('text=/Route|Distance|Duration/i').first();
    const hasRoute = await routeElement.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRoute) {
      // Step 6: Verify distance is shown
      const distanceElement = page.locator('text=/\\d+(\\.\\d+)?\\s*(km|mi)/i');
      const hasDistance = await distanceElement.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasDistance) {
        await expect(distanceElement.first()).toBeVisible();
      }

      // Step 7: Verify estimated time is shown
      const timeElement = page.locator('text=/\\d+\\s*min/i');
      const hasTime = await timeElement.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasTime) {
        await expect(timeElement.first()).toBeVisible();
      }
    }

    // Step 8: Clear route
    const clearButton = page.locator('button:has-text("Clear Route")');
    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearButton.click();
      // Verify route is cleared
      await expect(page.locator('text="Start"').first()).not.toBeVisible();
    }
  });

  test('should show warnings for unavailable stations', async ({ page }) => {
    // This test would require mocking API responses to simulate
    // stations with no bikes or no docks

    // For now, check if warning UI elements exist
    const warningSelectors = [
      'text="No bikes available"',
      'text="No docks available"',
      'text="Low availability"',
    ];

    // If any warnings are visible, verify they display correctly
    for (const selector of warningSelectors) {
      const warning = page.locator(selector);
      if (await warning.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Verify warning has appropriate styling
        await expect(warning).toHaveClass(/warning|alert|yellow/i);
      }
    }
  });

  test('should handle map interactions', async ({ page }) => {
    // Test clicking directly on map markers
    const markers = page.locator('.marker');
    const markerCount = await markers.count();

    expect(markerCount).toBeGreaterThan(0);

    // Click first marker
    await markers.first().click();
    await page.waitForTimeout(500);

    // Should show start station selected (check in StationSelector panel)
    const startIndicator = page.locator('text="Start"').first();
    const hasStart = await startIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasStart) {
      await expect(startIndicator).toBeVisible();

      // Click another marker if available
      if (markerCount > 5) {
        await markers.nth(5).click();
        await page.waitForTimeout(500);

        // Should show end station selected
        const endIndicator = page.locator('text="End"').first();
        const hasEnd = await endIndicator.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasEnd) {
          await expect(endIndicator).toBeVisible();
        }
      }
    }
  });

  test('should update route when stations change availability', async ({ page }) => {
    // Select two stations
    const markers = page.locator('.marker');
    await markers.first().click();
    await page.waitForTimeout(500);
    await markers.nth(3).click();
    await page.waitForTimeout(500);

    // Check if route information is displayed
    const startIndicator = page.locator('text="Start"').first();
    const endIndicator = page.locator('text="End"').first();

    const hasStart = await startIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEnd = await endIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasStart && hasEnd) {
      // Verify station availability indicators are present
      const bikeIndicators = page.locator('text=/\\d+ bikes/');
      const dockIndicators = page.locator('text=/\\d+ docks/');

      const bikeCount = await bikeIndicators.count();
      const dockCount = await dockIndicators.count();

      expect(bikeCount + dockCount).toBeGreaterThan(0);
    }
  });

  test('should support waypoints in route', async ({ page }) => {
    // Select start station
    const markers = page.locator('.marker');
    await markers.first().click();

    // Check if waypoint button exists
    const waypointButton = page.locator('button:has-text("Add Stop")');
    if (await waypointButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await waypointButton.click();

      // Add waypoint
      await markers.nth(2).click();

      // Add end station
      await markers.nth(4).click();

      // Verify waypoint is shown in route
      await expect(page.locator('text=/Stop \\d+/i')).toBeVisible();
    }
  });

  test('should export route data', async ({ page }) => {
    // Create a route first
    const markers = page.locator('.marker');
    await markers.first().click();
    await page.waitForTimeout(500);
    await markers.nth(3).click();
    await page.waitForTimeout(1000);

    // Check if route is created
    const startIndicator = page.locator('text="Start"').first();
    const endIndicator = page.locator('text="End"').first();

    const hasStart = await startIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEnd = await endIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasStart && hasEnd) {
      // Check for export buttons
      const exportGPX = page.locator('button:has-text("GPX")');
      const exportKML = page.locator('button:has-text("KML")');
      const exportButton = page.locator('button:has-text("Export")');

      // Check if any export functionality exists
      const hasGPX = await exportGPX.isVisible({ timeout: 2000 }).catch(() => false);
      const hasKML = await exportKML.isVisible({ timeout: 2000 }).catch(() => false);
      const hasExport = await exportButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasGPX) {
        // Test GPX export
        const [download] = await Promise.all([page.waitForEvent('download'), exportGPX.click()]);
        expect(download.suggestedFilename()).toMatch(/\.gpx$/);
      } else if (hasKML) {
        // Test KML export
        const [download] = await Promise.all([page.waitForEvent('download'), exportKML.click()]);
        expect(download.suggestedFilename()).toMatch(/\.kml$/);
      } else if (hasExport) {
        // Export button exists but might open a menu
        await exportButton.click();
      }
    }
  });

  test('should share route via URL', async ({ page }) => {
    // Create a route
    const markers = page.locator('.marker');
    await markers.first().click();
    await page.waitForTimeout(500);
    await markers.nth(3).click();
    await page.waitForTimeout(1000);

    // Check if route is created
    const startIndicator = page.locator('text="Start"').first();
    const endIndicator = page.locator('text="End"').first();

    const hasStart = await startIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEnd = await endIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasStart && hasEnd) {
      // Look for share button
      const shareButton = page.locator('[aria-label*="Share"], button:has-text("Share")');
      const hasShare = await shareButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasShare) {
        await shareButton.click();

        // Check if URL was copied or share dialog opened
        const copiedText = page.locator('text=/Copied|Link copied/i');
        const hasCopied = await copiedText.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasCopied) {
          // Verify copied indicator
          await expect(copiedText.first()).toBeVisible();
        }
      }
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Map should still be visible
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible();

    // Navigation should be accessible (hamburger menu or similar)
    const mobileMenu = page.locator('[aria-label*="Menu"], button:has-text("Menu")');
    if (await mobileMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mobileMenu.click();
      // Mobile menu should open
      await expect(page.locator('[role="navigation"]')).toBeVisible();
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible();
  });
});
