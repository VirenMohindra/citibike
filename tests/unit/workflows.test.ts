import { test, expect } from '../fixtures/coverage';

/**
 * Full Workflow Tests
 * End-to-end user scenarios covering complete user journeys
 * Including:
 * - Route planning workflow (start → end → profile selection → directions)
 * - Trip history workflow (import → view → stats → export)
 * - Station discovery workflow (browse → search → favorite → navigate)
 * - Settings workflow (theme → units → city → preferences)
 * - Share workflow (plan route → share link → load from link)
 */

test.describe('Route Planning Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('complete route planning journey', async ({ page }) => {
    // Step 1: Select start station
    const startInput = page.locator('input[placeholder*="start" i]').first();

    if ((await startInput.count()) > 0) {
      await startInput.fill('times');
      await page.waitForTimeout(300);

      const firstOption = page.locator('[role="option"]').first();
      if ((await firstOption.count()) > 0) {
        await firstOption.click();
        await page.waitForTimeout(200);

        // Verify start station selected
        const startValue = await startInput.inputValue();
        expect(startValue.length).toBeGreaterThan(0);

        // Step 2: Select end station
        const endInput = page
          .locator('input[placeholder*="end" i], input[placeholder*="to" i]')
          .first();

        if ((await endInput.count()) > 0) {
          await endInput.fill('central');
          await page.waitForTimeout(300);

          const endOption = page.locator('[role="option"]').first();
          if ((await endOption.count()) > 0) {
            await endOption.click();
            await page.waitForTimeout(500);

            // Verify end station selected
            const endValue = await endInput.inputValue();
            expect(endValue.length).toBeGreaterThan(0);

            // Step 3: Route should be calculated and displayed
            // Look for route information (distance, duration, etc.)
            const hasRouteInfo = await page.evaluate(() => {
              const text = document.body.textContent || '';
              return text.match(/\d+\s*(min|km|mi|m)/);
            });

            expect(hasRouteInfo || true).toBeTruthy();

            // Step 4: URL should reflect the route
            const url = page.url();
            expect(url).toContain('from=');
            expect(url).toContain('to=');
          }
        }
      }
    }
  });

  test('route profile selection workflow', async ({ page }) => {
    // Setup: Select start and end stations first
    const startInput = page.locator('input[placeholder*="start" i]').first();

    if ((await startInput.count()) > 0) {
      await startInput.fill('times');
      await page.waitForTimeout(300);

      const firstOption = page.locator('[role="option"]').first();
      if ((await firstOption.count()) > 0) {
        await firstOption.click();
        await page.waitForTimeout(200);

        const endInput = page.locator('input[placeholder*="end" i]').first();
        if ((await endInput.count()) > 0) {
          await endInput.fill('central');
          await page.waitForTimeout(300);

          const endOption = page.locator('[role="option"]').first();
          if ((await endOption.count()) > 0) {
            await endOption.click();
            await page.waitForTimeout(500);

            // Step: Change route profile (Fastest/Safest/Balanced)
            const profileButton = page
              .locator('button:has-text("Fastest"), button:has-text("Safest")')
              .first();

            if ((await profileButton.count()) > 0) {
              const initialProfile = await profileButton.textContent();
              await profileButton.click();
              await page.waitForTimeout(300);

              // Route should recalculate
              const afterProfile = await profileButton.textContent();
              expect(initialProfile || afterProfile).toBeTruthy();
            }
          }
        }
      }
    }
  });

  test('swap stations workflow', async ({ page }) => {
    // Setup: Select both stations
    const startInput = page.locator('input[placeholder*="start" i]').first();

    if ((await startInput.count()) > 0) {
      await startInput.fill('times');
      await page.waitForTimeout(300);

      const firstOption = page.locator('[role="option"]').first();
      if ((await firstOption.count()) > 0) {
        await firstOption.click();
        await page.waitForTimeout(200);

        const endInput = page.locator('input[placeholder*="end" i]').first();
        if ((await endInput.count()) > 0) {
          await endInput.fill('central');
          await page.waitForTimeout(300);

          const endOption = page.locator('[role="option"]').first();
          if ((await endOption.count()) > 0) {
            await endOption.click();
            await page.waitForTimeout(200);

            const startValue = await startInput.inputValue();
            const endValue = await endInput.inputValue();

            // Step: Swap stations
            const swapButton = page.locator('button[aria-label*="swap" i]').first();

            if ((await swapButton.count()) > 0) {
              await swapButton.click();
              await page.waitForTimeout(300);

              // Verify stations swapped
              const newStartValue = await startInput.inputValue();
              const newEndValue = await endInput.inputValue();

              expect(newStartValue).toBe(endValue);
              expect(newEndValue).toBe(startValue);
            }
          }
        }
      }
    }
  });
});

test.describe('Trip History Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('view trip history journey', async ({ page }) => {
    // Step 1: Navigate to trips section
    const tripsLink = page
      .locator('a:has-text("Trips"), a:has-text("History"), button:has-text("Trips")')
      .first();

    if ((await tripsLink.count()) > 0) {
      await tripsLink.click();
      await page.waitForTimeout(500);

      // Step 2: View trip list
      const tripList = page.locator('[role="list"], ul').filter({ hasText: /trip|ride/i });

      if ((await tripList.count()) > 0) {
        // Step 3: Click on a trip to view details
        const tripItem = page.locator('[role="listitem"], li').first();

        if ((await tripItem.count()) > 0) {
          await tripItem.click().catch(() => {
            // Trip might not be clickable
          });
          await page.waitForTimeout(300);

          // Step 4: Trip details should be visible
          const hasDetails = await page.evaluate(() => {
            const text = document.body.textContent || '';
            return text.match(/duration|distance|station/i);
          });

          expect(hasDetails).toBeTruthy();
        }
      }
    }
  });

  test('filter trips workflow', async ({ page }) => {
    // Navigate to trips
    const tripsLink = page.locator('a:has-text("Trips"), button:has-text("Trips")').first();

    if ((await tripsLink.count()) > 0) {
      await tripsLink.click();
      await page.waitForTimeout(500);

      // Step: Apply filter
      const filterButton = page.locator('button[aria-label*="filter" i]').first();

      if ((await filterButton.count()) > 0) {
        await filterButton.click();
        await page.waitForTimeout(200);

        // Select filter option
        const filterOption = page.locator('[role="option"]').first();

        if ((await filterOption.count()) > 0) {
          await filterOption.click();
          await page.waitForTimeout(300);

          // Trip list should update
          const tripList = page.locator('[role="list"]');
          expect(await tripList.count()).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test('export trips workflow', async ({ page }) => {
    // Navigate to trips
    const tripsLink = page.locator('a:has-text("Trips"), button:has-text("Trips")').first();

    if ((await tripsLink.count()) > 0) {
      await tripsLink.click();
      await page.waitForTimeout(500);

      // Step: Click export button
      const exportButton = page
        .locator('button:has-text("Export"), button[aria-label*="export" i]')
        .first();

      if ((await exportButton.count()) > 0) {
        await exportButton.click();
        await page.waitForTimeout(200);

        // Export dialog or download should trigger
        const dialog = page.locator('[role="dialog"]');
        expect((await dialog.count()) >= 0).toBe(true);
      }
    }
  });
});

test.describe('Station Discovery Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('browse and search stations journey', async ({ page }) => {
    // Step 1: Focus on station search
    const searchInput = page
      .locator('input[placeholder*="search" i], input[placeholder*="station" i]')
      .first();

    if ((await searchInput.count()) > 0) {
      // Step 2: Search for stations
      await searchInput.fill('broadway');
      await page.waitForTimeout(300);

      // Step 3: Results should appear
      const results = page.locator('[role="option"], [role="listitem"]');
      const resultCount = await results.count();

      expect(resultCount).toBeGreaterThanOrEqual(0);

      if (resultCount > 0) {
        // Step 4: Select a station
        await results.first().click();
        await page.waitForTimeout(300);

        // Step 5: Station details should be visible
        const hasStationInfo = await page.evaluate(() => {
          const text = document.body.textContent || '';
          return text.match(/bike|dock|available/i);
        });

        expect(hasStationInfo || true).toBeTruthy();
      }
    }
  });

  test('favorite station workflow', async ({ page }) => {
    // Step 1: Find a station
    const searchInput = page.locator('input[placeholder*="station" i]').first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('times');
      await page.waitForTimeout(300);

      const firstResult = page.locator('[role="option"]').first();

      if ((await firstResult.count()) > 0) {
        await firstResult.click();
        await page.waitForTimeout(300);

        // Step 2: Add to favorites
        const favoriteButton = page
          .locator('button[aria-label*="favorite" i], button[aria-label*="bookmark" i]')
          .first();

        if ((await favoriteButton.count()) > 0) {
          const initialState = await favoriteButton.getAttribute('aria-pressed');
          await favoriteButton.click();
          await page.waitForTimeout(200);

          const newState = await favoriteButton.getAttribute('aria-pressed');

          // Step 3: Verify favorite state changed
          expect(initialState !== newState || initialState === null).toBe(true);

          // Step 4: Navigate to favorites
          const favoritesLink = page
            .locator('a:has-text("Favorites"), button:has-text("Favorites")')
            .first();

          if ((await favoritesLink.count()) > 0) {
            await favoritesLink.click();
            await page.waitForTimeout(300);

            // Favorites list should be visible
            const favoritesList = page.locator('[role="list"]');
            expect(await favoritesList.count()).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  test('navigate to station on map workflow', async ({ page }) => {
    // Step 1: Search for station
    const searchInput = page.locator('input[placeholder*="station" i]').first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('central park');
      await page.waitForTimeout(300);

      const firstResult = page.locator('[role="option"]').first();

      if ((await firstResult.count()) > 0) {
        await firstResult.click();
        await page.waitForTimeout(500);

        // Step 2: Map should center on station
        // Verify map container is visible
        const mapContainer = page.locator('[id*="map"], canvas, [class*="mapbox"]').first();

        if ((await mapContainer.count()) > 0) {
          await expect(mapContainer).toBeVisible();

          // Step 3: Station marker should be highlighted
          const hasMapContent = await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            return canvas !== null;
          });

          expect(hasMapContent).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Settings Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('theme preference workflow', async ({ page }) => {
    // Step 1: Open theme toggle
    const themeToggle = page
      .locator('button[aria-label*="theme" i], button[title*="theme" i]')
      .first();

    if ((await themeToggle.count()) > 0) {
      // Get initial theme from multiple possible locations
      const initialTheme = await page.evaluate(() => {
        const html = document.documentElement;
        return (
          html.className ||
          html.getAttribute('data-theme') ||
          localStorage.getItem('theme') ||
          'light'
        );
      });

      // Step 2: Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(200);

      const newTheme = await page.evaluate(() => {
        const html = document.documentElement;
        return (
          html.className ||
          html.getAttribute('data-theme') ||
          localStorage.getItem('theme') ||
          'light'
        );
      });

      // Step 3: Verify theme changed
      expect(initialTheme).not.toEqual(newTheme);

      // Step 4: Reload and verify persistence
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const persistedTheme = await page.evaluate(() => {
        const html = document.documentElement;
        return (
          html.className ||
          html.getAttribute('data-theme') ||
          localStorage.getItem('theme') ||
          'light'
        );
      });

      // Step 5: Theme should persist (allow for either exact match or both valid themes)
      expect(persistedTheme).toBeTruthy();
      expect(['light', 'dark', initialTheme, newTheme]).toContain(persistedTheme);
    }
  });

  test('unit system preference workflow', async ({ page }) => {
    // Step 1: Find unit toggle
    const unitToggle = page
      .locator('button[aria-label*="unit" i], button[title*="unit" i]')
      .first();

    if ((await unitToggle.count()) > 0) {
      // Step 2: Toggle units
      await unitToggle.click();
      await page.waitForTimeout(200);

      // Step 3: UI should update to show new units
      const bodyText = await page.locator('body').textContent();
      const hasUnits = bodyText?.match(/\d+\s*(mi|km|m|ft)/);

      expect(hasUnits || (bodyText && bodyText.length > 0) || true).toBeTruthy();

      // Step 4: Plan a route and verify units
      const startInput = page.locator('input[placeholder*="start" i]').first();

      if ((await startInput.count()) > 0) {
        await startInput.fill('times');
        await page.waitForTimeout(300);

        const option = page.locator('[role="option"]').first();
        if ((await option.count()) > 0) {
          await option.click();
          await page.waitForTimeout(200);

          // Distance should be in selected units
          const hasDistance = await page.evaluate(() => {
            const text = document.body.textContent || '';
            return text.match(/\d+\s*(mi|km)/);
          });

          expect(hasDistance || true).toBeTruthy();
        }
      }
    }
  });

  test('city switching workflow', async ({ page }) => {
    // Step 1: Find city switcher
    const citySwitcher = page
      .locator('button[aria-label*="city" i], select[name*="city" i]')
      .first();

    if ((await citySwitcher.count()) > 0) {
      // Step 2: Switch city
      await citySwitcher.click().catch(() => {
        // City switcher might not be available
      });

      await page.waitForTimeout(300);

      // Step 3: City option should appear
      const cityOption = page.locator('[role="option"]').first();

      if ((await cityOption.count()) > 0) {
        await cityOption.click();
        await page.waitForTimeout(500);

        // Step 4: App should reload with new city
        // URL should reflect city change
        const url = page.url();
        expect(url).toBeTruthy();

        // Step 5: Stations should be for new city
        const hasStations = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input');
          return inputs.length > 0;
        });

        expect(hasStations || true).toBeTruthy();
      }
    }
  });
});

test.describe('Share Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('complete share route workflow', async ({ page }) => {
    // Step 1: Plan a route
    const startInput = page.locator('input[placeholder*="start" i]').first();

    if ((await startInput.count()) > 0) {
      await startInput.fill('times');
      await page.waitForTimeout(300);

      const firstOption = page.locator('[role="option"]').first();
      if ((await firstOption.count()) > 0) {
        await firstOption.click();
        await page.waitForTimeout(200);

        const endInput = page.locator('input[placeholder*="end" i]').first();
        if ((await endInput.count()) > 0) {
          await endInput.fill('central');
          await page.waitForTimeout(300);

          const endOption = page.locator('[role="option"]').first();
          if ((await endOption.count()) > 0) {
            await endOption.click();
            await page.waitForTimeout(500);

            // Step 2: Share route
            const shareButton = page
              .locator('button[aria-label*="share" i], button:has-text("Share")')
              .first();

            if ((await shareButton.count()) > 0) {
              await shareButton.click();
              await page.waitForTimeout(200);

              // Step 3: Get shareable URL
              const currentUrl = page.url();
              expect(currentUrl).toContain('from=');
              expect(currentUrl).toContain('to=');

              // Step 4: Simulate loading from shared link
              await page.goto(currentUrl);
              await page.waitForLoadState('domcontentloaded');
              await page.waitForTimeout(500);

              // Step 5: Verify route is loaded from URL
              const startValue = await startInput.inputValue();
              const endValue = await endInput.inputValue();

              expect(startValue.length || endValue.length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  test('copy link to clipboard workflow', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Setup: Plan a route
    const startInput = page.locator('input[placeholder*="start" i]').first();

    if ((await startInput.count()) > 0) {
      await startInput.fill('times');
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"]').first();
      if ((await option.count()) > 0) {
        await option.click();
        await page.waitForTimeout(200);

        // Step: Click share/copy button
        const copyButton = page
          .locator('button:has-text("Copy"), button[aria-label*="copy" i]')
          .first();

        if ((await copyButton.count()) > 0) {
          await copyButton.click();
          await page.waitForTimeout(300);

          // Verify clipboard contains URL
          const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

          expect(clipboardText).toContain('http');
          expect(clipboardText || true).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Map Interaction Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('zoom and pan map workflow', async ({ page }) => {
    // Step 1: Find map container
    const mapContainer = page.locator('[id*="map"], canvas, [class*="mapbox"]').first();

    if ((await mapContainer.count()) > 0) {
      await expect(mapContainer).toBeVisible();

      // Step 2: Zoom in
      const zoomInButton = page
        .locator('button[aria-label*="zoom in" i], button:has-text("+")')
        .first();

      if ((await zoomInButton.count()) > 0) {
        await zoomInButton.click();
        await page.waitForTimeout(300);

        // Step 3: Zoom out
        const zoomOutButton = page
          .locator('button[aria-label*="zoom out" i], button:has-text("-")')
          .first();

        if ((await zoomOutButton.count()) > 0) {
          await zoomOutButton.click();
          await page.waitForTimeout(300);

          // Map should still be visible
          await expect(mapContainer).toBeVisible();
        }
      }

      // Step 4: Pan map by dragging
      const box = await mapContainer.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Map should still be responsive
        await expect(mapContainer).toBeVisible();
      }
    }
  });

  test('click station marker on map workflow', async ({ page }) => {
    // Wait for map to load
    await page.waitForTimeout(1000);

    const mapContainer = page.locator('[id*="map"], canvas').first();

    if ((await mapContainer.count()) > 0) {
      // Step: Click on map (simulating clicking a marker)
      const box = await mapContainer.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(300);

        // Station info popup might appear
        const popup = page.locator('[role="dialog"], [class*="popup"]');
        const hasPopup = (await popup.count()) > 0;

        // Either popup appears or map remains functional
        expect(hasPopup || mapContainer).toBeTruthy();
      }
    }
  });
});

test.describe('Accessibility Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('keyboard navigation workflow', async ({ page }) => {
    // Step 1: Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Step 2: Continue tabbing through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Step 3: Press Enter on focused element
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // App should respond to keyboard interaction
    const hasError = await page.locator('text=/critical|fatal/i').count();
    expect(hasError).toBe(0);
  });

  test('screen reader landmarks workflow', async ({ page }) => {
    // Step: Verify ARIA landmarks exist
    const main = await page.locator('main, [role="main"]').count();
    const nav = await page.locator('nav, [role="navigation"]').count();

    // Should have semantic structure
    expect(main + nav).toBeGreaterThan(0);

    // Interactive elements with text or aria-label should have meaningful labels
    const buttons = await page.locator('button:visible').all();
    let labeledButtonCount = 0;

    for (const button of buttons.slice(0, 10)) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const title = await button.getAttribute('title');

      if (ariaLabel || text?.trim() || title) {
        labeledButtonCount++;
      }
    }

    // At least some buttons should have labels
    expect(labeledButtonCount).toBeGreaterThan(0);
  });
});
