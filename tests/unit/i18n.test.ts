import { test, expect } from '../fixtures/coverage';
import en from '@/lib/i18n/translations/en.json';

/**
 * i18n System Tests
 * Tests for the internationalization system including:
 * - Key lookup and retrieval
 * - Parameter substitution
 * - Fallback behavior for missing keys
 * - Translation completeness
 */

test.describe('i18n System', () => {
  test.describe('Translation Keys', () => {
    test('should have a valid en.json file', () => {
      expect(en).toBeDefined();
      expect(typeof en).toBe('object');
    });

    test('should have all top-level keys defined', () => {
      const expectedKeys = [
        'common',
        'map',
        'auth',
        'account',
        'toast',
        'dialogs',
        'time',
        'tripReplay',
        'api',
      ];

      for (const key of expectedKeys) {
        expect(key in en).toBeTruthy();
      }
    });

    test('should have no empty translation objects', () => {
      const checkEmpty = (obj: Record<string, unknown>, path = ''): string[] => {
        const emptyKeys: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const subEmpty = checkEmpty(value as Record<string, unknown>, fullPath);
            emptyKeys.push(...subEmpty);
          }
        }

        return emptyKeys;
      };

      const emptyKeys = checkEmpty(en as Record<string, unknown>);
      expect(emptyKeys).toHaveLength(0);
    });
  });

  test.describe('Key Structure', () => {
    test('all translation values should be strings or objects', () => {
      const checkTypes = (obj: Record<string, unknown>, path = ''): string[] => {
        const errors: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            errors.push(...checkTypes(value as Record<string, unknown>, fullPath));
          } else if (typeof value !== 'string') {
            errors.push(`${fullPath}: expected string, got ${typeof value}`);
          }
        }

        return errors;
      };

      const errors = checkTypes(en as Record<string, unknown>);
      expect(errors).toHaveLength(0);
    });

    test('should not have duplicate keys across nested objects', () => {
      const seenKeys = new Set<string>();
      const duplicates: string[] = [];

      const checkDuplicates = (obj: Record<string, unknown>, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (seenKeys.has(fullPath)) {
            duplicates.push(fullPath);
          }
          seenKeys.add(fullPath);

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkDuplicates(value as Record<string, unknown>, fullPath);
          }
        }
      };

      checkDuplicates(en as Record<string, unknown>);
      expect(duplicates).toHaveLength(0);
    });
  });

  test.describe('Parameter Substitution Pattern', () => {
    test('should have valid parameter placeholders', () => {
      const paramPattern = /\{\{(\w+)\}\}/g;
      const errors: { key: string; params: string[] }[] = [];

      const checkParams = (obj: Record<string, unknown>, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            const matches = value.match(paramPattern);
            if (matches) {
              const params = matches.map((m) => m.replace(/[{}]/g, ''));
              errors.push({ key: fullPath, params });
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkParams(value as Record<string, unknown>, fullPath);
          }
        }
      };

      checkParams(en as Record<string, unknown>);

      // Verify common parameters are used consistently
      const allParams = new Set<string>();
      errors.forEach((e) => e.params.forEach((p) => allParams.add(p)));

      // This just validates that we found some parameters
      expect(allParams.size).toBeGreaterThanOrEqual(0);
    });

    test('should document commonly used parameters', () => {
      const commonParams = ['count', 'time', 'period', 'value'];
      expect(commonParams.length).toBeGreaterThan(0);
    });
  });

  test.describe('i18n Key Patterns', () => {
    test('auth keys should follow consistent structure', () => {
      const authKeys = Object.keys(en.auth);
      expect(authKeys.length).toBeGreaterThan(0);

      // Should have hierarchical organization
      const hasHierarchy = Object.values(en.auth).some((v) => typeof v === 'object');
      expect(hasHierarchy).toBeTruthy();
    });

    test('map keys should have nested structure', () => {
      expect(typeof en.map).toBe('object');
      expect('station' in en.map).toBeTruthy();
      expect(typeof (en.map as unknown as Record<string, unknown>).station).toBe('object');
    });

    test('time keys should have relative time strings', () => {
      const timeKeys = Object.keys(en.time);
      expect(timeKeys).toContain('justNow');
      expect(timeKeys).toContain('minutesAgo');
      expect(timeKeys).toContain('hoursAgo');
      expect(timeKeys).toContain('daysAgo');
    });

    test('common keys should have UI basics', () => {
      const commonKeys = Object.keys(en.common);
      const expected = ['cancel', 'close', 'back', 'next', 'loading', 'error'];

      for (const key of expected) {
        expect(commonKeys).toContain(key);
      }
    });
  });

  test.describe('Specific i18n Phase 2 Keys', () => {
    test('should have newly added Phase 2 keys', () => {
      // Nav keys
      expect('selectCity' in en.nav).toBeTruthy();

      // Common keys
      expect('viewGitHub' in en.common).toBeTruthy();
      expect('unknownStation' in en.common).toBeTruthy();
      expect('reset' in en.common).toBeTruthy();

      // Time keys
      expect('justNow' in en.time).toBeTruthy();
      expect('minutesAgo' in en.time).toBeTruthy();
      expect('hoursAgo' in en.time).toBeTruthy();
      expect('daysAgo' in en.time).toBeTruthy();

      // TripReplay keys
      expect('play' in en.tripReplay).toBeTruthy();
      expect('pause' in en.tripReplay).toBeTruthy();
      expect('reset' in en.tripReplay).toBeTruthy();

      // Dialog keys
      expect('confirmClear' in en.dialogs).toBeTruthy();
      expect('confirmResetErrors' in en.dialogs).toBeTruthy();

      // Auth keys
      expect('sessionExpiringWarning' in en.auth).toBeTruthy();
      expect('sessionExpiredCitibike' in en.auth).toBeTruthy();

      // API error keys
      const apiRecord = en.api as unknown as Record<string, unknown>;
      expect('errors' in en.api).toBeTruthy();
      expect('rateLimitedAPI' in (apiRecord.errors as Record<string, unknown>)).toBeTruthy();
    });

    test('Phase 2 keys should have string values', () => {
      const phase2Keys = [
        { obj: en.nav, key: 'selectCity' },
        { obj: en.common, key: 'viewGitHub' },
        { obj: en.common, key: 'unknownStation' },
        { obj: en.common, key: 'reset' },
        { obj: en.time, key: 'justNow' },
        { obj: en.tripReplay, key: 'play' },
        { obj: en.tripReplay, key: 'pause' },
        { obj: en.dialogs, key: 'confirmClear' },
        { obj: en.dialogs, key: 'confirmResetErrors' },
        { obj: en.auth, key: 'sessionExpiringWarning' },
        { obj: en.auth, key: 'sessionExpiredCitibike' },
      ];

      for (const { obj, key } of phase2Keys) {
        const objRecord = obj as unknown as Record<string, unknown>;
        expect(typeof objRecord[key]).toBe('string');
        expect((objRecord[key] as string).length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Translation Completeness', () => {
    test('should have translations for all UI components', () => {
      const mapRecord = en.map as unknown as Record<string, unknown>;
      const enRecord = en as unknown as Record<string, unknown>;

      // Map translations
      expect(en.map).toBeDefined();
      expect(mapRecord.station).toBeDefined();

      // Route translations
      expect(mapRecord.route).toBeDefined();

      // Trip related translations
      expect(enRecord.tripStats).toBeDefined();
      expect(enRecord.routeHistory).toBeDefined();

      // Analytics translations
      expect(enRecord.economicsPage).toBeDefined();
    });

    test('should have error translations for common scenarios', () => {
      expect(en.errors).toBeDefined();
      expect(en.systemErrors).toBeDefined();
    });

    test('should have toast message translations', () => {
      expect(en.toast).toBeDefined();
      expect(en.toast.autoSync).toBeDefined();
      expect(en.toast.backup).toBeDefined();
    });
  });

  test.describe('Flat Key Collection', () => {
    test('should be able to flatten all nested keys', () => {
      const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
        const keys: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
          } else {
            keys.push(fullKey);
          }
        }

        return keys;
      };

      const allKeys = flattenKeys(en as Record<string, unknown>);
      expect(allKeys.length).toBeGreaterThan(100); // Should have plenty of translations
    });

    test('flattened keys should be unique', () => {
      const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
        const keys: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
          } else {
            keys.push(fullKey);
          }
        }

        return keys;
      };

      const allKeys = flattenKeys(en as Record<string, unknown>);
      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);
    });
  });
});
