/* eslint-disable react/jsx-no-literals */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { db } from '@/lib/db/schema';
import { type MinimalStation, normalizeTrip } from '@/lib/db/utils';
import NavBar from '@/components/nav/NavBar';

export default function NormalizePage() {
  const router = useRouter();
  const { citibikeUser } = useAppStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'normalizing' | 'complete' | 'error'>(
    'idle'
  );
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [stats, setStats] = useState<{
    totalTrips: number;
    normalizedTrips: number;
    toNormalize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState(60);

  // Load initial statistics
  const loadStats = useCallback(async () => {
    if (!citibikeUser) return;

    setStatus('loading');
    try {
      const allTrips = await db.trips.where({ userId: citibikeUser.id }).toArray();
      const normalizedTrips = allTrips.filter((t) => t.normalized);

      setStats({
        totalTrips: allTrips.length,
        normalizedTrips: normalizedTrips.length,
        toNormalize: allTrips.length - normalizedTrips.length,
      });
      setStatus('idle');
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      setStatus('error');
    }
  }, [citibikeUser]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function startNormalization() {
    if (!citibikeUser) return;

    setStatus('normalizing');
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      // 1. Fetch GBFS stations
      console.log('Fetching GBFS stations...');
      const response = await fetch('https://gbfs.citibikenyc.com/gbfs/en/station_information.json');
      if (!response.ok) {
        throw new Error('Failed to fetch station data');
      }
      const data = (await response.json()) as {
        data: {
          stations: Array<{
            station_id: string;
            name: string;
            lat: number;
            lon: number;
            capacity?: number;
            region_id?: string;
            rental_methods?: string[];
          }>;
        };
      };
      const stations: MinimalStation[] = data.data.stations.map((station) => ({
        station_id: station.station_id,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
      }));

      console.log(`Fetched ${stations.length} stations`);

      // 2. Get trips to normalize
      const allTrips = await db.trips.where({ userId: citibikeUser.id }).toArray();
      const tripsToNormalize = allTrips.filter((t) => !t.normalized);

      console.log(`Found ${tripsToNormalize.length} trips to normalize`);
      setProgress({ current: 0, total: tripsToNormalize.length });

      if (tripsToNormalize.length === 0) {
        setStatus('complete');
        await loadStats();
        return;
      }

      // 3. Process trips in batches
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < tripsToNormalize.length; i += batchSize) {
        const batch = tripsToNormalize.slice(i, i + batchSize);

        await db.transaction('rw', db.trips, async () => {
          for (const trip of batch) {
            const updates = normalizeTrip(trip, stations, hourlyRate);
            await db.trips.update(trip.id, updates);
            processed++;
            setProgress({ current: processed, total: tripsToNormalize.length });
          }
        });

        // Small delay to allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log(`Successfully normalized ${processed} trips`);
      setStatus('complete');
      await loadStats();
    } catch (err) {
      console.error('Normalization failed:', err);
      setError(err instanceof Error ? err.message : 'Normalization failed');
      setStatus('error');
    }
  }

  // Redirect if not logged in
  if (!citibikeUser) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please log in to normalize your trip data
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3]"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Trip Data Normalization
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Enhance your trip data with detailed analysis and insights
            </p>

            {/* Statistics */}
            {stats && (
              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Trips</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalTrips.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Normalized</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.normalizedTrips.toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">To Normalize</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.toNormalize.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Hourly Rate Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Hourly Rate (for time value calculation)
              </label>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 60)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={status === 'normalizing'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    /hour
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Used to calculate time value savings
                </div>
              </div>
            </div>

            {/* What Gets Normalized */}
            <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                What gets normalized:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Resolve &quot;Unknown&quot; station names using GBFS coordinates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Calculate accurate distances (from polylines or haversine)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Calculate trip costs (e-bike fees, overage fees)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Categorize by distance, duration, and time of day</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Estimate subway alternative times</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Calculate suitability scores and net value</span>
                </li>
              </ul>
            </div>

            {/* Progress Bar */}
            {status === 'normalizing' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Normalizing trips...
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {progress.current} / {progress.total} ({Math.round(progressPercent)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">Error</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {status === 'complete' && (
              <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✅</span>
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Success!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      All trips have been normalized. You can now view detailed analytics.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={startNormalization}
                disabled={
                  status === 'normalizing' || status === 'loading' || stats?.toNormalize === 0
                }
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {status === 'normalizing'
                  ? 'Normalizing...'
                  : stats?.toNormalize === 0
                    ? 'All Trips Normalized ✓'
                    : `Normalize ${stats?.toNormalize.toLocaleString()} Trips`}
              </button>

              {status === 'complete' && (
                <button
                  onClick={() => router.push('/analysis/economics')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  View Analytics →
                </button>
              )}

              <button
                onClick={() => router.push('/trips')}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
