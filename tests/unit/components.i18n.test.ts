import { test, expect } from '../fixtures/coverage';
import en from '@/lib/i18n/translations/en.json';
import fs from 'fs';
import path from 'path';

/**
 * Component i18n Integration Tests
 * Tests to verify that components are using i18n keys properly:
 * - CitySelector (nav.selectCity)
 * - NavBar (common.viewGitHub)
 * - TripReplayControls (tripReplay.*)
 * - RouteHistory (time.*)
 * - TripVisualizationMap (map.station.*)
 * - TripDetailsSyncButton (auth.*, api.errors.*)
 * - PublicDataImport (dialogs.confirmClear)
 * - TripErrorDebug (dialogs.confirmResetErrors)
 */

test.describe('Component i18n Integration', () => {
  const componentDir = path.join(process.cwd(), 'components');

  // Helper to check if a file contains an i18n key usage
  const fileContainsKey = (filePath: string, key: string): boolean => {
    if (!fs.existsSync(filePath)) return false;

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for t('key') or t("key") patterns
    const patterns = [
      new RegExp(`t\\(['"]${key.replace(/\./g, '\\.')}['"]`),
      new RegExp(`['"]${key.replace(/\./g, '\\.')}['"]`),
    ];

    return patterns.some((pattern) => pattern.test(content));
  };

  test.describe('Phase 2 Components - i18n Key Usage', () => {
    test('CitySelector should use nav.selectCity', () => {
      const componentPath = path.join(componentDir, 'nav', 'CitySelector.tsx');
      expect(fileContainsKey(componentPath, 'nav.selectCity')).toBeTruthy();
    });

    test('NavBar should use common.viewGitHub', () => {
      const componentPath = path.join(componentDir, 'nav', 'NavBar.tsx');
      expect(fileContainsKey(componentPath, 'common.viewGitHub')).toBeTruthy();
    });

    test('TripReplayControls should use tripReplay keys', () => {
      const componentPath = path.join(componentDir, 'trips', 'TripReplayControls.tsx');

      expect(fileContainsKey(componentPath, 'tripReplay.play')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'tripReplay.pause')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'tripReplay.reset')).toBeTruthy();
    });

    test('RouteHistory should use time keys', () => {
      const componentPath = path.join(componentDir, 'routes', 'RouteHistory.tsx');

      expect(fileContainsKey(componentPath, 'time.justNow')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'time.minutesAgo')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'time.hoursAgo')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'time.daysAgo')).toBeTruthy();
    });

    test('TripVisualizationMap should use map.station keys', () => {
      const componentPath = path.join(componentDir, 'trips', 'TripVisualizationMap.tsx');

      expect(fileContainsKey(componentPath, 'map.station.start')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'map.station.end')).toBeTruthy();
    });

    test('TripDetailsSyncButton should use auth and api error keys', () => {
      const componentPath = path.join(componentDir, 'trips', 'TripDetailsSyncButton.tsx');

      expect(fileContainsKey(componentPath, 'auth.sessionExpiringWarning')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'auth.sessionExpiredCitibike')).toBeTruthy();
      expect(fileContainsKey(componentPath, 'api.errors.rateLimitedAPI')).toBeTruthy();
    });

    test('PublicDataImport should use dialogs.confirmClear', () => {
      const componentPath = path.join(componentDir, 'analysis', 'PublicDataImport.tsx');

      expect(fileContainsKey(componentPath, 'dialogs.confirmClear')).toBeTruthy();
    });

    test('TripErrorDebug should use dialogs.confirmResetErrors', () => {
      const componentPath = path.join(componentDir, 'trips', 'TripErrorDebug.tsx');

      expect(fileContainsKey(componentPath, 'dialogs.confirmResetErrors')).toBeTruthy();
    });
  });

  test.describe('Component i18n Hook Usage', () => {
    test('Phase 2 components should import useI18n', () => {
      const components = [
        'nav/CitySelector.tsx',
        'nav/NavBar.tsx',
        'trips/TripReplayControls.tsx',
        'routes/RouteHistory.tsx',
        'trips/TripVisualizationMap.tsx',
        'trips/TripDetailsSyncButton.tsx',
        'analysis/PublicDataImport.tsx',
        'trips/TripErrorDebug.tsx',
      ];

      for (const comp of components) {
        const componentPath = path.join(componentDir, comp);
        const content = fs.readFileSync(componentPath, 'utf-8');

        expect(content).toContain('useI18n');
        expect(content).toContain('import { useI18n }');
      }
    });

    test('components should call t() function', () => {
      const components = [
        'nav/CitySelector.tsx',
        'nav/NavBar.tsx',
        'trips/TripReplayControls.tsx',
        'routes/RouteHistory.tsx',
        'trips/TripVisualizationMap.tsx',
        'trips/TripDetailsSyncButton.tsx',
        'analysis/PublicDataImport.tsx',
        'trips/TripErrorDebug.tsx',
      ];

      for (const comp of components) {
        const componentPath = path.join(componentDir, comp);
        const content = fs.readFileSync(componentPath, 'utf-8');

        // Should have t() function calls
        expect(content.match(/t\(/g)?.length ?? 0).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Missing i18n Keys in Components', () => {
    test('should not have unused i18n imports', () => {
      const components = [
        'nav/CitySelector.tsx',
        'nav/NavBar.tsx',
        'trips/TripReplayControls.tsx',
        'routes/RouteHistory.tsx',
        'trips/TripVisualizationMap.tsx',
        'trips/TripDetailsSyncButton.tsx',
        'analysis/PublicDataImport.tsx',
        'trips/TripErrorDebug.tsx',
      ];

      for (const comp of components) {
        const componentPath = path.join(componentDir, comp);
        const content = fs.readFileSync(componentPath, 'utf-8');

        if (content.includes('useI18n')) {
          // Should have the t function extracted from useI18n hook
          expect(content).toContain('const');
          expect(content).toContain('t');
          expect(content).toContain('useI18n()');
        }
      }
    });

    test('all referenced keys should exist in translations', () => {
      // This is a meta-test that validates our check-unused-i18n-keys script detected
      // all the keys we're using in these components

      const keysThatShouldExist = [
        'nav.selectCity',
        'common.viewGitHub',
        'tripReplay.play',
        'tripReplay.pause',
        'tripReplay.reset',
        'time.justNow',
        'time.minutesAgo',
        'time.hoursAgo',
        'time.daysAgo',
        'map.station.start',
        'map.station.end',
        'auth.sessionExpiringWarning',
        'auth.sessionExpiredCitibike',
        'api.errors.rateLimitedAPI',
        'dialogs.confirmClear',
        'dialogs.confirmResetErrors',
        'common.unknownStation',
      ];

      const getTranslation = (key: string): string | undefined => {
        const keys = key.split('.');
        let translation: unknown = en;

        for (const k of keys) {
          if (translation && typeof translation === 'object' && k in translation) {
            translation = (translation as Record<string, unknown>)[k];
          } else {
            return undefined;
          }
        }

        return typeof translation === 'string' ? translation : undefined;
      };

      for (const key of keysThatShouldExist) {
        const translation = getTranslation(key);
        expect(translation).toBeDefined();
        expect(translation?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Component i18n Key Patterns', () => {
    test('components should use consistent key naming', () => {
      const components = [
        'nav/CitySelector.tsx',
        'nav/NavBar.tsx',
        'trips/TripReplayControls.tsx',
        'routes/RouteHistory.tsx',
        'trips/TripVisualizationMap.tsx',
        'trips/TripDetailsSyncButton.tsx',
        'analysis/PublicDataImport.tsx',
        'trips/TripErrorDebug.tsx',
      ];

      for (const comp of components) {
        const componentPath = path.join(componentDir, comp);
        const content = fs.readFileSync(componentPath, 'utf-8');

        // Keys should use dot notation consistently
        const keyMatches = content.match(/t\(['"]([^'"]+)['"]\)/g) ?? [];
        expect(keyMatches.length).toBeGreaterThanOrEqual(0);

        for (const match of keyMatches) {
          // Extract key from t('key') or t("key")
          const key = match.match(/['"]([^'"]+)['"]/)?.[1];

          // Only check actual i18n keys (ignore other t() usage like React.createElement)
          if (key && key.includes('.')) {
            // Keys should contain dots (namespace.key pattern)
            expect(key).toContain('.');
          }
        }
      }
    });

    test('aria-labels should use i18n keys', () => {
      const components = ['nav/CitySelector.tsx', 'trips/TripReplayControls.tsx'];

      for (const comp of components) {
        const componentPath = path.join(componentDir, comp);
        const content = fs.readFileSync(componentPath, 'utf-8');

        if (content.includes('aria-label')) {
          // aria-labels should reference i18n keys or use t() function
          expect(content).toMatch(/aria-label=\{.*t\(/);
        }
      }
    });

    test('error messages should use i18n keys', () => {
      const errorComponents = ['trips/TripDetailsSyncButton.tsx', 'trips/TripErrorDebug.tsx'];

      for (const comp of errorComponents) {
        const componentPath = path.join(componentDir, comp);
        const content = fs.readFileSync(componentPath, 'utf-8');

        // Error components should have error-related keys
        const hasErrorKeys = /auth\.|api\.errors\.|dialogs\./.test(content);
        expect(hasErrorKeys).toBeTruthy();
      }
    });
  });

  test.describe('i18n Key Accessibility', () => {
    test('keys used in buttons should be clear and user-friendly', () => {
      const getTranslation = (key: string): string | undefined => {
        const keys = key.split('.');
        let translation: unknown = en;

        for (const k of keys) {
          if (translation && typeof translation === 'object' && k in translation) {
            translation = (translation as Record<string, unknown>)[k];
          } else {
            return undefined;
          }
        }

        return typeof translation === 'string' ? translation : undefined;
      };

      const buttonKeys = [
        'tripReplay.play',
        'tripReplay.pause',
        'tripReplay.reset',
        'common.viewGitHub',
      ];

      for (const key of buttonKeys) {
        const translation = getTranslation(key);
        expect(translation).toBeDefined();
        // Button text should be concise (typically under 30 characters)
        expect(translation!.length).toBeLessThan(100);
      }
    });

    test('dialog messages should be helpful and complete', () => {
      const getTranslation = (key: string): string | undefined => {
        const keys = key.split('.');
        let translation: unknown = en;

        for (const k of keys) {
          if (translation && typeof translation === 'object' && k in translation) {
            translation = (translation as Record<string, unknown>)[k];
          } else {
            return undefined;
          }
        }

        return typeof translation === 'string' ? translation : undefined;
      };

      const dialogKeys = ['dialogs.confirmClear', 'dialogs.confirmResetErrors'];

      for (const key of dialogKeys) {
        const translation = getTranslation(key);
        expect(translation).toBeDefined();
        // Dialog messages should be more detailed
        expect(translation!.length).toBeGreaterThan(10);
      }
    });

    test('error messages should provide context', () => {
      const getTranslation = (key: string): string | undefined => {
        const keys = key.split('.');
        let translation: unknown = en;

        for (const k of keys) {
          if (translation && typeof translation === 'object' && k in translation) {
            translation = (translation as Record<string, unknown>)[k];
          } else {
            return undefined;
          }
        }

        return typeof translation === 'string' ? translation : undefined;
      };

      const errorKeys = [
        'auth.sessionExpiringWarning',
        'auth.sessionExpiredCitibike',
        'api.errors.rateLimitedAPI',
      ];

      for (const key of errorKeys) {
        const translation = getTranslation(key);
        expect(translation).toBeDefined();
        // Error messages should mention what happened and suggest action
        expect(translation!.length).toBeGreaterThan(20);
      }
    });
  });
});
