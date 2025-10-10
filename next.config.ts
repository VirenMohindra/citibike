import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
    // Custom runtime caching for Mapbox tiles
    runtimeCaching: [
      {
        // Mapbox vector tiles - cache first, fallback to network
        urlPattern: /^https:\/\/api\.mapbox\.com\/v4\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-tiles-v1',
          expiration: {
            maxEntries: 500, // Limit to 500 tiles
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Mapbox styles - cache first
        urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/v1\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-styles-v1',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Mapbox fonts/glyphs - cache first
        urlPattern: /^https:\/\/api\.mapbox\.com\/fonts\/v1\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-glyphs-v1',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year (fonts rarely change)
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Mapbox sprites - cache first
        urlPattern: /^https:\/\/api\.mapbox\.com\/.*\/sprite.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-sprites-v1',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // CitiBike GBFS API - stale while revalidate
        urlPattern: /^https:\/\/gbfs\.citibikenyc\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'citibike-api-v1',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images
  images: {
    domains: ['gbfs.citibikenyc.com', 'api.mapbox.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Remove powered by header for security
  poweredByHeader: false,

  // Experimental features for performance
  experimental: {
    // Optimize CSS
    optimizeCss: true,
  },

  // Webpack configuration for optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,

        // Split chunks for better caching
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,

            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },

            // Library chunk
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module: { context: string }) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `npm.${packageName?.replace('@', '')}`;
              },
              priority: 10,
              minChunks: 2,
            },

            // Mapbox chunk (large library)
            mapbox: {
              test: /[\\/]node_modules[\\/](mapbox-gl|@mapbox)[\\/]/,
              name: 'mapbox',
              priority: 30,
              reuseExistingChunk: true,
            },

            // Commons chunk for shared code
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 5,
            },
          },
        },
      };

      // Minimize bundle size
      config.optimization.minimize = true;
    }

    // Ignore unnecessary files
    config.module.rules.push({
      test: /\.(test|spec)\.(js|jsx|ts|tsx)$/,
      loader: 'ignore-loader',
    });

    // Add bundle analyzer in analyze mode
    if (process.env.ANALYZE === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BundleAnalyzerPlugin = require('@next/bundle-analyzer')({
        enabled: true,
      });
      config.plugins.push(
        new BundleAnalyzerPlugin.BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },

  // Headers for optimization
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Cache static assets
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for optimization
  async redirects() {
    return [];
  },

  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
};

export default withPWA(nextConfig);
