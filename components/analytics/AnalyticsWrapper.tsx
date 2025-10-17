'use client';

import { Analytics } from '@vercel/analytics/next';
import { useAppStore } from '@/lib/store';

/**
 * DEMO MODE: Wrapper for Vercel Analytics that filters demo mode events
 * Must be a client component to use beforeSend callback
 */
export default function AnalyticsWrapper() {
  const { isDemoMode } = useAppStore();

  return (
    <Analytics
      beforeSend={(event) => {
        // Filter out demo mode events to avoid polluting metrics
        if (isDemoMode) {
          return null; // Don't send event
        }
        return event;
      }}
    />
  );
}
