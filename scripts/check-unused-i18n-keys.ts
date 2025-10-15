#!/usr/bin/env npx tsx
/**
 * Check for unused i18n keys in en.json
 *
 * This script finds all translation keys defined in lib/i18n/translations/en.json
 * and checks if they are actually used in the codebase.
 *
 * Usage: npx tsx scripts/check-unused-i18n-keys.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Get all flat keys from en.json
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
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
}

// Check if a key is used in the codebase
function isKeyUsed(key: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execSync } = require('child_process');

  try {
    // Search in components, lib, and app directories
    const searchDirs = ['components', 'lib', 'app'];

    for (const dir of searchDirs) {
      try {
        // Pattern 1: t('key') - direct call with single quotes
        const result1 = execSync(
          `grep -r "t('${key}'" "${dir}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -1`,
          {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        ).trim();

        if (result1) {
          return true;
        }

        // Pattern 2: t("key") - direct call with double quotes
        const result2 = execSync(
          `grep -r 't("${key}"' "${dir}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -1`,
          {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        ).trim();

        if (result2) {
          return true;
        }

        // Pattern 3: String literal used as argument: 'key' (handles function arguments like generatePopupHTML(x, 'key'))
        const result3 = execSync(
          `grep -r "'${key}'" "${dir}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -1`,
          {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        ).trim();

        if (result3) {
          return true;
        }

        // Pattern 4: String literal with double quotes: "key"
        const result4 = execSync(
          `grep -r '"${key}"' "${dir}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -1`,
          {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        ).trim();

        if (result4) {
          return true;
        }
      } catch {
        // Directory might not exist or no matches found, continue to next
      }
    }

    return false;
  } catch {
    return false;
  }
}

// Main function
function main() {
  const translationsPath = path.join(process.cwd(), 'lib/i18n/translations/en.json');

  if (!fs.existsSync(translationsPath)) {
    console.error(`❌ File not found: ${translationsPath}`);
    process.exit(1);
  }

  const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
  const allKeys = flattenKeys(translations);

  console.log(`📊 Total i18n keys: ${allKeys.length}`);
  console.log('🔍 Checking for unused keys...\n');

  const unusedKeys: string[] = [];
  const usedKeys: string[] = [];

  for (const key of allKeys) {
    if (isKeyUsed(key)) {
      usedKeys.push(key);
    } else {
      unusedKeys.push(key);
    }
  }

  // Report unused keys
  if (unusedKeys.length > 0) {
    console.log(`⚠️  Found ${unusedKeys.length} unused keys:\n`);
    unusedKeys.forEach((key) => {
      console.log(`   - ${key}`);
    });
    console.log('');
  }

  // Summary
  console.log(`✅ Used keys: ${usedKeys.length}`);
  console.log(`❌ Unused keys: ${unusedKeys.length}`);
  console.log(`📈 Usage: ${((usedKeys.length / allKeys.length) * 100).toFixed(1)}%`);

  // Exit with error code if unused keys exist
  if (unusedKeys.length > 0) {
    console.log('\n💡 Tip: Remove unused keys to keep en.json clean and maintainable');
    process.exit(1);
  }

  process.exit(0);
}

main();
