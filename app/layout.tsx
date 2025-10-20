import type { Metadata, Viewport } from 'next';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme-context';
import { ToastProvider } from '@/lib/toast-context';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AnalyticsWrapper from '@/components/analytics/AnalyticsWrapper';
import DemoInitializerWrapper from '@/components/demo/DemoInitializerWrapper';
import DemoBanner from '@/components/demo/DemoBanner';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://citibike-one.vercel.app'),
  title: 'Citibike Route Planner - NYC Bike Share Navigation',
  description:
    'Plan your Citibike routes in NYC. Find stations, check bike availability, and navigate between locations with real-time data.',
  keywords: ['citibike', 'nyc', 'bike share', 'route planner', 'cycling', 'navigation'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Citibike',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Citibike Route Planner',
    description: 'Plan your Citibike routes in NYC with real-time data',
    url: 'https://citibike-one.vercel.app',
    siteName: 'Citibike Route Planner',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Citibike Route Planner',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Citibike Route Planner',
    description: 'Plan your Citibike routes in NYC with real-time data',
    images: ['/icon-512x512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0066CC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <DemoInitializerWrapper />
              <DemoBanner />
              {children}
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
        <AnalyticsWrapper />
        <SpeedInsights />
      </body>
    </html>
  );
}
