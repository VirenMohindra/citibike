/**
 * Environment Configuration and Validation
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod';

// ============================================
// Environment Schema
// ============================================
const envSchema = z.object({
  // Required for map functionality (optional in test/CI environments)
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('pk.'), {
      message: 'Mapbox token must start with "pk." if provided',
    }),

  // Optional - Required for authentication features
  CITIBIKE_CLIENT_ID: z.string().optional(),
  CITIBIKE_CLIENT_SECRET: z.string().optional(),

  // Optional - API URLs (with defaults)
  NEXT_PUBLIC_LYFT_API_URL: z.string().url().optional().default('https://api.lyft.com'),
  NEXT_PUBLIC_GBFS_API_URL: z.string().url().optional().default('https://gbfs.citibikenyc.com'),

  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),
});

// ============================================
// Parsed Environment
// ============================================
export type Environment = z.infer<typeof envSchema>;

let cachedEnv: Environment | null = null;

/**
 * Get validated environment variables
 * Throws an error if validation fails
 */
export function getEnvironment(): Environment {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Invalid environment configuration. Please check your .env.local file.');
    }
    throw error;
  }
}

/**
 * Validate environment on startup (server-side only)
 */
export function validateEnvironment(): void {
  if (typeof window !== 'undefined') {
    return; // Skip validation in browser
  }

  try {
    const env = getEnvironment();
    console.log('✅ Environment validated successfully');

    // Log feature availability
    console.log('📋 Features:');
    console.log(`  - Maps: ${env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? '✅' : '❌'}`);
    console.log(
      `  - Authentication: ${env.CITIBIKE_CLIENT_ID && env.CITIBIKE_CLIENT_SECRET ? '✅' : '❌'}`
    );
    console.log(`  - Environment: ${env.NODE_ENV}`);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}

// ============================================
// Environment Helpers
// ============================================

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Check if we're running on the server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if we're running in the browser
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if authentication is configured
 */
export function hasAuthConfiguration(): boolean {
  const env = getEnvironment();
  return Boolean(env.CITIBIKE_CLIENT_ID && env.CITIBIKE_CLIENT_SECRET);
}

// ============================================
// Feature Flags from Environment
// ============================================
export function getFeatureFlags() {
  const env = getEnvironment();

  return {
    // Core features
    maps: Boolean(env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN),
    authentication: hasAuthConfiguration(),

    // Development features
    debugMode: isDevelopment() && process.env.DEBUG === 'true',
    verboseLogging: isDevelopment() && process.env.VERBOSE === 'true',

    // Future features (controlled by env vars)
    darkMode: process.env.NEXT_PUBLIC_FEATURE_DARK_MODE === 'true',
    pwa: process.env.NEXT_PUBLIC_FEATURE_PWA === 'true',
    tripHistory: process.env.NEXT_PUBLIC_FEATURE_TRIP_HISTORY === 'true',
    analytics: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true',
  };
}

// ============================================
// Configuration Based on Environment
// ============================================
export function getConfig() {
  const env = getEnvironment();
  const features = getFeatureFlags();

  return {
    app: {
      name: 'Citibike Route Planner',
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
    },
    api: {
      lyft: {
        url: env.NEXT_PUBLIC_LYFT_API_URL,
        hasCredentials: hasAuthConfiguration(),
      },
      gbfs: {
        url: env.NEXT_PUBLIC_GBFS_API_URL,
      },
      mapbox: {
        token: env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
      },
    },
    features,
    debug: {
      enabled: features.debugMode,
      verbose: features.verboseLogging,
    },
  };
}

// ============================================
// Environment Variable Getters
// ============================================

/**
 * Get Mapbox access token
 * Throws if not configured
 */
export function getMapboxToken(): string {
  const env = getEnvironment();
  if (!env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    throw new Error('Mapbox access token is not configured');
  }
  return env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
}

/**
 * Get Citibike API credentials
 * Returns null if not configured
 */
export function getCitibikeCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const env = getEnvironment();
  if (!env.CITIBIKE_CLIENT_ID || !env.CITIBIKE_CLIENT_SECRET) {
    return null;
  }
  return {
    clientId: env.CITIBIKE_CLIENT_ID,
    clientSecret: env.CITIBIKE_CLIENT_SECRET,
  };
}

// ============================================
// Runtime Validation
// ============================================

/**
 * Assert that a required environment variable exists
 * Use for critical runtime checks
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an environment variable with a default value
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// ============================================
// Export for use in app
// ============================================
export const env = getEnvironment();
