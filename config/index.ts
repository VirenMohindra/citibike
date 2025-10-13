/**
 * Configuration Module
 * Central export point for all configuration
 */

// Export all constants
export * from './constants';

// Export all API configuration
export * from './api';

// Export all routes
export * from './routes';

// Export environment utilities
export * from './environment';

// Export city configuration
export * from './cities';

// ============================================
// Quick Access Exports
// ============================================

import { APP_NAME, APP_VERSION, APP_DESCRIPTION } from './constants';
import { API_CONFIG } from './api';
import { PAGES, API_ROUTES, EXTERNAL_LINKS } from './routes';
import { getConfig, getFeatureFlags } from './environment';

/**
 * Application metadata
 */
export const APP_META = {
  name: APP_NAME,
  version: APP_VERSION,
  description: APP_DESCRIPTION,
} as const;

/**
 * Get full application configuration
 */
export function getAppConfig() {
  const config = getConfig();
  const features = getFeatureFlags();

  return {
    ...APP_META,
    api: API_CONFIG,
    routes: {
      pages: PAGES,
      api: API_ROUTES,
      external: EXTERNAL_LINKS,
    },
    features,
    environment: config.app.environment,
  };
}

// Default export for convenience
const config = {
  APP_META,
  API_CONFIG,
  PAGES,
  API_ROUTES,
  getConfig: getAppConfig,
};

export default config;
