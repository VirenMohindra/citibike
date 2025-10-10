/**
 * ================================================================
 * ESLint Configuration for i18n String Detection
 * ================================================================
 * Optional ESLint configuration that enforces translation usage
 * for user-facing strings in React components
 *
 * TO ENABLE THIS CONFIGURATION:
 * 1. Import this file in your main eslint.config.mjs
 * 2. Add it to your eslint config array
 *
 * Example:
 *   import i18nConfig from './eslint.config.i18n.mjs';
 *   const eslintConfig = [
 *     ...compat.extends("next/core-web-vitals", "next/typescript"),
 *     i18nConfig, // Add this line
 *     // ... rest of config
 *   ];
 * ================================================================
 */

import reactPlugin from 'eslint-plugin-react';

const i18nConfig = {
  files: ['**/*.tsx', '**/*.jsx'],
  plugins: {
    react: reactPlugin,
  },
  rules: {
    /**
     * react/jsx-no-literals
     * Prevents hardcoded strings in JSX
     *
     * Configuration:
     * - Allows numbers (counts, IDs, etc.)
     * - Allows common single-character literals
     * - Ignores className, style props (technical, not user-facing)
     * - Set to 'warn' so it doesn't block development
     *
     * When ready to enforce strictly, change to 'error'
     */
    'react/jsx-no-literals': [
      'warn', // Change to 'error' when most strings are translated
      {
        // Allow these props to have literal values
        // (they typically contain technical strings, not user-facing text)
        noStrings: true,
        allowedStrings: [
          // Single characters
          ' ',
          ',',
          '.',
          '!',
          '?',
          ':',
          ';',
          '-',
          '—',
          '/',
          '\\',
          '|',
          '•',
          '●',

          // Common symbols/emojis (single char or very short)
          '→',
          '←',
          '↑',
          '↓',
          '×',
          '✓',
          '✗',
          '+',
          '*',
          '#',
          '⭐',
          '⚡',

          // Emojis used as icons
          '🔒',
          '🅿',
          '🌱',
          '⏱️',
          '📍',
          '🗺️',
          '🚲',

          // Technical units (not translatable)
          'km',
          'mi',
          'mph',
          'kg',
          'lb',
          'g',
          'm',
          's',

          // Technical formats/file types
          'GPX',
          'KML',
          'JSON',
          'CSV',

          // Common technical words (case-sensitive)
          'S',
          'E',
          'N',
          'W', // Compass directions as single letters

          // Parentheses
          '(',
          ')',

          // Empty string
          '',
        ],
        ignoreProps: true, // Don't check prop values (reduces false positives)
      },
    ],
  },
};

export default i18nConfig;
