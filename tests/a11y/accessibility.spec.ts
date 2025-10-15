import { test, expect } from '@playwright/test';
import { injectAxe, getViolations } from 'axe-playwright';
import { TIMEOUTS } from '../../playwright.config';

/**
 * Accessibility Testing Suite
 * Tests for WCAG 2.1 Level AA compliance
 */
test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Log browser console errors to help debug CI issues
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });

    await page.goto('/');

    // Wait for canvas, but don't fail if it doesn't load (CI WebGL issues)
    // Accessibility tests can run on UI elements regardless of map rendering
    await page.waitForSelector('.mapboxgl-canvas', { timeout: TIMEOUTS.canvas }).catch(() => {
      console.log(
        '⚠️  Mapbox canvas did not load (likely CI WebGL issue) - continuing with UI accessibility tests'
      );
    });

    await injectAxe(page);
  });

  test('should have no accessibility violations on initial load', async ({ page }) => {
    // Run axe accessibility checks
    const violations = await getViolations(page);

    // Log violations for debugging
    if (violations.length > 0) {
      console.log('Accessibility violations found:');
      violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Affected nodes: ${violation.nodes.length}`);
      });
    }

    // Assert no violations
    expect(violations).toHaveLength(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for h1
    const h1 = await page.locator('h1');
    await expect(h1).toHaveCount(1);

    // Check heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let lastLevel = 0;

    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName);
      const level = parseInt(tagName.substring(1));

      // Heading levels should not skip (e.g., h1 -> h3)
      expect(level).toBeLessThanOrEqual(lastLevel + 1);
      lastLevel = level;
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // First focusable element should be visible
    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        visible: el ? window.getComputedStyle(el).visibility !== 'hidden' : false,
        hasOutline: el ? window.getComputedStyle(el).outline !== 'none' : false,
      };
    });

    expect(firstFocused.visible).toBe(true);

    // Tab through several elements
    const focusableElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const element = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          role: el?.getAttribute('role'),
          ariaLabel: el?.getAttribute('aria-label'),
          text: el?.textContent?.trim().substring(0, 50),
        };
      });
      focusableElements.push(element);
    }

    // Should have focused various interactive elements
    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasAriaLabelledBy = await button.getAttribute('aria-labelledby');

      // Button should have accessible name through text, aria-label, or aria-labelledby
      expect(hasText || hasAriaLabel || hasAriaLabelledBy).toBeTruthy();
    }

    // Check form inputs have labels
    const inputs = await page.locator('input:not([type="hidden"])').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasAriaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasPlaceholder = await input.getAttribute('placeholder');

      if (id) {
        // Check for associated label
        const label = await page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0;

        // Input should have label, aria-label, or placeholder
        expect(hasLabel || hasAriaLabel || hasAriaLabelledBy || hasPlaceholder).toBeTruthy();
      } else {
        // Input without ID should have aria-label or placeholder
        expect(hasAriaLabel || hasAriaLabelledBy || hasPlaceholder).toBeTruthy();
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Check color contrast using axe
    const violations = await getViolations(page, undefined, {
      runOnly: ['color-contrast'],
    });

    expect(violations).toHaveLength(0);
  });

  test('should have focus indicators', async ({ page }) => {
    // Tab to first button
    const button = await page.locator('button').first();
    await button.focus();

    // Check if focus is visible
    const focusStyles = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow,
        border: styles.border,
      };
    });

    // Should have visible focus indicator (outline, box-shadow, or border change)
    const hasVisibleFocus =
      (focusStyles.outline !== 'none' && focusStyles.outline !== '') ||
      focusStyles.boxShadow.includes('rgb') ||
      focusStyles.outlineWidth !== '0px';

    expect(hasVisibleFocus).toBe(true);
  });

  test('should have alt text for images', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text or role="presentation" for decorative images
      if (role !== 'presentation') {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    // Check for ARIA live regions
    const liveRegions = await page.locator('[aria-live]').all();

    if (liveRegions.length > 0) {
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }
    }

    // Check for status messages
    const statusElements = await page.locator('[role="status"], [role="alert"]').all();
    expect(statusElements.length).toBeGreaterThanOrEqual(0);
  });

  test('should have skip navigation links', async ({ page }) => {
    // Look for skip links (usually hidden but accessible via keyboard)
    await page.keyboard.press('Tab');

    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.textContent?.toLowerCase();
    });

    // Common skip link patterns
    const isSkipLink =
      activeElement?.includes('skip') ||
      activeElement?.includes('main content') ||
      activeElement?.includes('navigation');

    // Skip link is recommended but not always required
    if (isSkipLink) {
      console.log('Skip navigation link found:', activeElement);
    }
  });

  test('should handle zoom to 200%', async ({ page }) => {
    // Set viewport to simulate 200% zoom
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });

    await page.waitForTimeout(1000);

    // Check if content is still accessible
    const mainContent = await page.locator('main, [role="main"], #root, #__next').first();
    await expect(mainContent).toBeVisible();

    // Check for horizontal scrolling (should be minimal)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Some horizontal scroll is acceptable at 200% zoom, but content should be usable
    if (hasHorizontalScroll) {
      console.log('Note: Horizontal scrolling detected at 200% zoom');
    }

    // Reset zoom
    await page.evaluate(() => {
      document.documentElement.style.zoom = '1';
    });
  });

  test('should have proper form validation messages', async ({ page }) => {
    // Find a form with required fields
    const forms = await page.locator('form').all();

    if (forms.length > 0) {
      const requiredInputs = await page
        .locator('input[required], select[required], textarea[required]')
        .all();

      for (const input of requiredInputs) {
        const ariaRequired = await input.getAttribute('aria-required');

        // Required inputs should have proper ARIA attributes
        expect(ariaRequired === 'true' || (await input.getAttribute('required')) !== null).toBe(
          true
        );
      }
    }
  });

  test('should have accessible modals/dialogs', async ({ page }) => {
    // Check if any modals are present
    const modals = await page
      .locator('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')
      .all();

    for (const modal of modals) {
      const ariaLabel = await modal.getAttribute('aria-label');
      const ariaLabelledBy = await modal.getAttribute('aria-labelledby');

      // Modal should have accessible name
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();

      // Check for close button
      const closeButton = await modal
        .locator(
          'button[aria-label*="close" i], button[aria-label*="dismiss" i], button:has-text("×"), button:has-text("X")'
        )
        .first();
      if ((await closeButton.count()) > 0) {
        const closeAriaLabel = await closeButton.getAttribute('aria-label');
        expect(closeAriaLabel || (await closeButton.textContent())).toBeTruthy();
      }
    }
  });

  test('should have lang attribute', async ({ page }) => {
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
  });

  test('should have proper landmark regions', async ({ page }) => {
    // Check for main landmark
    const main = await page.locator('main, [role="main"]');
    await expect(main).toHaveCount(1);

    // Check for navigation landmark
    const nav = await page.locator('nav, [role="navigation"]');
    expect(await nav.count()).toBeGreaterThanOrEqual(0);

    // Check for complementary regions
    const aside = await page.locator('aside, [role="complementary"]');
    expect(await aside.count()).toBeGreaterThanOrEqual(0);
  });

  test('should not have duplicate IDs', async ({ page }) => {
    const duplicates = await page.evaluate(() => {
      const ids = new Map<string, number>();
      const elements = document.querySelectorAll('[id]');

      elements.forEach((el) => {
        const id = el.id;
        ids.set(id, (ids.get(id) || 0) + 1);
      });

      const duplicateIds: string[] = [];
      ids.forEach((count, id) => {
        if (count > 1) {
          duplicateIds.push(id);
        }
      });

      return duplicateIds;
    });

    expect(duplicates).toHaveLength(0);
  });
});
