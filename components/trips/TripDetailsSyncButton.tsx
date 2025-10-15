'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { createSyncManager } from '@/lib/db/sync-manager';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '@/lib/i18n';

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export default function TripDetailsSyncButton() {
  const { t } = useI18n();
  const { citibikeUser } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Count trips with and without details
  const tripStats = useLiveQuery(async () => {
    if (!citibikeUser?.id) return null;

    const allTrips = await db.trips.where({ userId: citibikeUser.id }).count();
    const tripsWithDetails = await db.trips
      .where({ userId: citibikeUser.id })
      .filter((trip) => trip.detailsFetched === true)
      .count();

    return {
      total: allTrips,
      withDetails: tripsWithDetails,
      needsDetails: allTrips - tripsWithDetails,
      percentage: allTrips > 0 ? Math.round((tripsWithDetails / allTrips) * 100) : 0,
    };
  }, [citibikeUser?.id]);

  const handleSync = async () => {
    if (!citibikeUser?.id || isSyncing) return;

    // Check token expiry before starting sync
    const expiresAtCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('citibike_token_expires_at='))
      ?.split('=')[1];

    if (expiresAtCookie) {
      const expiresAt = parseInt(expiresAtCookie, 10);
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // If token expires in less than 5 minutes or already expired
      if (timeUntilExpiry < 5 * 60 * 1000) {
        setError(t('auth.sessionExpiringWarning'));
        return;
      }
    }

    setIsSyncing(true);
    setError(null);
    setProgress(null);

    try {
      const syncManager = createSyncManager(citibikeUser.id);

      const result = await syncManager.syncTripDetails(
        (progressUpdate) => {
          setProgress(progressUpdate);
        },
        {
          batchSize: 1,
          rateLimit: 500, // 0.5 seconds between requests = 2 req/sec (safe and efficient)
        }
      );

      console.log('✅ Bulk sync complete:', result);
      setProgress(null);

      // Show message if we hit rate limits
      if (result.failed > 0) {
        setError(
          `Synced ${result.fetched} trips. ${result.failed} failed (possibly rate limited). Try again later.`
        );
      }
    } catch (err) {
      console.error('❌ Bulk sync failed:', err);

      // Check if it's a session expired error
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      const isSessionExpired =
        errorMessage.includes('SESSION_EXPIRED') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('Invalid request');
      const isRateLimited = errorMessage.includes('RATE_LIMITED');

      if (isSessionExpired && !isRateLimited) {
        setError(t('auth.sessionExpiredCitibike'));
      } else if (isRateLimited) {
        setError(t('api.errors.rateLimitedAPI'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (!tripStats || tripStats.total === 0) {
    return null;
  }

  // If all trips have details, show a simple status badge
  if (tripStats.needsDetails === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <svg
          className="w-4 h-4 text-green-600 dark:text-green-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          {t('tripsPage.sync.allSynced')} ({tripStats.total})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Stats */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {tripStats.withDetails}/{tripStats.total}
        </span>{' '}
        {t('tripsPage.sync.statsText')} ({tripStats.percentage}
        {t('tripsPage.sync.percentage')})
      </div>

      {/* Sync Button */}
      {!isSyncing ? (
        <button
          onClick={handleSync}
          disabled={tripStats.needsDetails === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('tripsPage.sync.buttonSync')} {tripStats.needsDetails}{' '}
          {tripStats.needsDetails !== 1
            ? t('tripsPage.sync.buttonTrips')
            : t('tripsPage.sync.buttonTrip')}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0066CC]"></div>

          {/* Progress */}
          {progress && (
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {progress.completed}/{progress.total}
              </span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">
                ({Math.round((progress.completed / progress.total) * 100)}
                {t('tripsPage.sync.progressPercentage')})
              </span>
              {progress.failed > 0 && (
                <span className="text-red-600 dark:text-red-400 ml-2">
                  {progress.failed} {t('tripsPage.sync.progressFailed')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
