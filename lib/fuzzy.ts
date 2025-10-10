/**
 * Fuzzy search implementation using Fuse.js library
 * Provides efficient fuzzy matching with built-in Levenshtein distance support
 */

import Fuse, { type IFuseOptions } from 'fuse.js';

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches: {
    field: string;
    indices: [number, number][];
  }[];
}

/**
 * Perform fuzzy search on an array of items using Fuse.js
 *
 * Fuse.js provides built-in Levenshtein distance matching through its
 * distance threshold option, which determines how many character edits
 * (insertions, deletions, substitutions) are allowed for a match.
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  options: {
    keys: (keyof T)[];
    threshold?: number; // Minimum score threshold (0-1)
    limit?: number;
  }
): FuzzySearchResult<T>[] {
  const { keys, threshold = 0.3, limit = 20 } = options;

  // Handle empty query - return first N items
  if (!query || query.trim().length === 0) {
    return items.slice(0, limit).map((item) => ({
      item,
      score: 1,
      matches: [],
    }));
  }

  // Configure Fuse.js options
  const fuseOptions: IFuseOptions<T> = {
    keys: keys as string[],
    // Fuse.js threshold is inverted: 0 = exact match, 1 = match anything
    // We need to invert our threshold for Fuse.js
    threshold: 1 - threshold,
    includeScore: true,
    includeMatches: true,
    // Levenshtein distance configuration
    distance: 100, // Maximum Levenshtein distance
    ignoreLocation: true, // Don't bias results based on match location
    minMatchCharLength: 1, // Minimum characters to trigger a match
    // Scoring configuration
    shouldSort: true, // Sort by score
    // Extended search options for better matching
    useExtendedSearch: false,
    // Field weight can be configured per key if needed
    getFn: (obj: T, path: string | string[]) => {
      const pathStr = typeof path === 'string' ? path : path.join('.');
      const value = pathStr
        .split('.')
        .reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], obj);
      return value?.toString() || '';
    },
  };

  // Create Fuse instance
  const fuse = new Fuse(items, fuseOptions);

  // Perform search
  const fuseResults = fuse.search(query, { limit });

  // Transform Fuse.js results to our format
  return fuseResults
    .map((result) => {
      // Fuse.js score: 0 = perfect match, 1 = no match
      // Our score: 1 = perfect match, 0 = no match
      const score = result.score !== undefined ? 1 - result.score : 0;

      // Transform matches to our format
      const matches: FuzzySearchResult<T>['matches'] = [];
      if (result.matches) {
        for (const match of result.matches) {
          if (match.key) {
            const indices: [number, number][] = match.indices.map(([start, end]) => [start, end]);
            matches.push({
              field: match.key,
              indices,
            });
          }
        }
      }

      return {
        item: result.item,
        score,
        matches,
      };
    })
    .filter((result) => result.score >= threshold);
}

/**
 * Highlight matched portions of text
 * This function is preserved for potential future use in the UI
 */
export function highlightMatches(
  text: string,
  indices: [number, number][],
  highlightClass: string = 'bg-yellow-200'
): string {
  if (indices.length === 0) return text;

  let result = '';
  let lastIndex = 0;

  // Sort indices by start position to ensure correct highlighting
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedIndices) {
    // Add text before the match
    result += text.slice(lastIndex, start);
    // Add highlighted match
    result += `<span class="${highlightClass}">${text.slice(start, end + 1)}</span>`;
    lastIndex = end + 1;
  }

  // Add remaining text
  result += text.slice(lastIndex);
  return result;
}
