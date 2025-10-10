'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { Trip } from '@/lib/db/schema';

interface ErrorStats {
  errorCode: string;
  count: number;
  trips: Trip[];
}

export default function TripErrorDebug({ userId }: { userId: string | null }) {
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!userId) return;

    void loadErrorStats();
  }, [userId]);

  async function loadErrorStats() {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Get all trips with errors
      const failedTrips = await db.trips
        .where({ userId })
        .filter((t) => t.detailsFetchError !== undefined)
        .toArray();

      // Group by error code
      const groups = failedTrips.reduce(
        (acc, trip) => {
          const code = trip.detailsFetchError || 'UNKNOWN';
          if (!acc[code]) {
            acc[code] = { errorCode: code, count: 0, trips: [] };
          }
          acc[code].count++;
          acc[code].trips.push(trip);
          return acc;
        },
        {} as Record<string, ErrorStats>
      );

      const stats = Object.values(groups).sort((a, b) => b.count - a.count);
      setErrorStats(stats);
    } catch (error) {
      console.error('Failed to load error stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function resetAllErrors() {
    if (!userId) return;
    if (!confirm('Reset all error tracking? This will allow trips to be retried.')) return;

    setIsResetting(true);
    try {
      const failedTrips = await db.trips
        .where({ userId })
        .filter((t) => t.detailsFetchError !== undefined)
        .toArray();

      for (const trip of failedTrips) {
        await db.trips.update(trip.id, {
          detailsFetchError: undefined,
          detailsFetchAttempts: 0,
        });
      }

      console.log(`✅ Reset ${failedTrips.length} trips`);
      await loadErrorStats();
    } catch (error) {
      console.error('Failed to reset errors:', error);
    } finally {
      setIsResetting(false);
    }
  }

  async function resetErrorType(errorCode: string) {
    if (!userId) return;
    if (!confirm(`Reset all trips with error "${errorCode}"?`)) return;

    setIsResetting(true);
    try {
      const trips = await db.trips
        .where({ userId })
        .filter((t) => t.detailsFetchError !== undefined && t.detailsFetchError === errorCode)
        .toArray();

      for (const trip of trips) {
        await db.trips.update(trip.id, {
          detailsFetchError: undefined,
          detailsFetchAttempts: 0,
        });
      }

      console.log(`✅ Reset ${trips.length} trips with error "${errorCode}"`);
      await loadErrorStats();
    } catch (error) {
      console.error('Failed to reset errors:', error);
    } finally {
      setIsResetting(false);
    }
  }

  if (!userId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const totalErrors = errorStats.reduce((sum, stat) => sum + stat.count, 0);

  if (totalErrors === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-green-600 dark:text-green-400">✅ No trips with errors!</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Trip Fetch Errors ({totalErrors} trips)
        </h3>
        <button
          onClick={resetAllErrors}
          disabled={isResetting}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isResetting ? 'Resetting...' : 'Reset All'}
        </button>
      </div>

      <div className="space-y-3">
        {errorStats.map((stat) => (
          <div
            key={stat.errorCode}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                  {stat.errorCode}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.count} trip{stat.count !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => resetErrorType(stat.errorCode)}
                disabled={isResetting}
                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            {/* Show sample trips with high attempt counts */}
            {stat.trips.some((t) => (t.detailsFetchAttempts || 0) > 5) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-semibold">High retry counts:</p>
                {stat.trips
                  .filter((t) => (t.detailsFetchAttempts || 0) > 5)
                  .slice(0, 3)
                  .map((trip) => (
                    <div key={trip.id} className="font-mono">
                      {trip.id.slice(-12)} - {trip.detailsFetchAttempts} attempts
                    </div>
                  ))}
              </div>
            )}

            {/* Error explanation */}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {stat.errorCode === 'RATE_LIMITED' && (
                <p>
                  ⚠️ <strong>Rate Limited:</strong> Too many requests. Wait before retrying.
                </p>
              )}
              {stat.errorCode === 'NOT_FOUND' && (
                <p>
                  🔍 <strong>Not Found:</strong> Trip IDs don&apos;t exist in Lyft&apos;s system
                  (deleted or invalid).
                </p>
              )}
              {stat.errorCode === 'HTTP_404' && (
                <p>
                  🔍 <strong>HTTP 404:</strong> Trip IDs don&apos;t exist in Lyft&apos;s system
                  (deleted or invalid).
                </p>
              )}
              {stat.errorCode === 'UNAUTHORIZED' && (
                <p>
                  🔐 <strong>Unauthorized:</strong> Session expired. Log in again.
                </p>
              )}
              {stat.errorCode === 'NETWORK_ERROR' && (
                <p>
                  🌐 <strong>Network Error:</strong> Connection issue or server unreachable.
                </p>
              )}
              {stat.errorCode === 'SERVER_ERROR' && (
                <p>
                  🔧 <strong>Server Error:</strong> Lyft API returned 500+ error.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="mb-2">
          <strong>Tip:</strong> Reset rate-limited trips and wait 1 hour before retrying.
        </p>
        <p>Trips with NOT_FOUND or HTTP_404 errors are likely permanently unavailable.</p>
      </div>
    </div>
  );
}
