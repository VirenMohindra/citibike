'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/lib/toast-context';
import { db, createSyncManager, useTrips } from '@/lib/db';
import {
  calculateTripStats,
  formatCO2,
  formatDuration,
  formatMoney,
  getTripsPerMonthAverage,
  getLongestTrip,
} from '@/lib/stats';
import type { TripStats as TripStatsType, Trip } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { supabase, isSupabaseConfigured, signInWithGoogle, signOut } from '@/lib/supabase/client';
import { backupTripsToCloud, restoreTripsFromCloud, getCloudTripCount } from '@/lib/supabase/sync';
import type { User } from '@supabase/supabase-js';

export default function TripStats() {
  const { t, formatDistance } = useI18n();
  const { addToast } = useToast();
  const { citibikeUser, distanceUnit } = useAppStore();
  const [stats, setStats] = useState<TripStatsType | null>(null);
  const [tripsPerMonth, setTripsPerMonth] = useState<number>(0);
  const [longestTrip, setLongestTrip] = useState<Trip | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    page: number;
    totalSynced: number;
  } | null>(null);

  // Cloud backup state
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [cloudTripCount, setCloudTripCount] = useState<number>(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  // Use new Dexie hook to get trips reactively
  // This automatically updates when trips change!
  const trips = useTrips(citibikeUser?.id || null);

  // Calculate stats whenever trips change
  useEffect(() => {
    if (trips && trips.length > 0) {
      // Convert DB trips to legacy format for calculateTripStats
      const legacyTrips: Trip[] = trips.map((t) => ({
        ...t,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime),
      }));
      const calculatedStats = calculateTripStats(legacyTrips);
      setStats(calculatedStats);

      // Calculate additional stats
      const avgPerMonth = getTripsPerMonthAverage(legacyTrips);
      setTripsPerMonth(avgPerMonth);

      const longest = getLongestTrip(legacyTrips);
      setLongestTrip(longest);
    } else if (trips && trips.length === 0) {
      setStats({
        totalTrips: 0,
        totalDistance: 0,
        totalDuration: 0,
        co2Saved: 0,
        moneySaved: 0,
        favoriteStartStations: [],
        favoriteEndStations: [],
        ridingPatterns: {
          byMonth: {},
          byDayOfWeek: {},
          byHour: {},
        },
        bikeTypeUsage: { classic: 0, ebike: 0 },
      });
      setTripsPerMonth(0);
      setLongestTrip(null);
    }
  }, [trips]);

  // Check Supabase auth and load cloud trip count
  useEffect(() => {
    if (!supabaseConfigured) return;

    const loadCloudStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSupabaseUser(user);

      if (user) {
        const count = await getCloudTripCount();
        setCloudTripCount(count);
      }
    };

    loadCloudStatus();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSupabaseUser(session?.user || null);
      if (session?.user) {
        const count = await getCloudTripCount();
        setCloudTripCount(count);
      } else {
        setCloudTripCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  // Sync trips and trip details using new SyncManager
  const syncTrips = async () => {
    if (!citibikeUser) return;

    try {
      setIsSyncing(true);
      const syncManager = createSyncManager(citibikeUser.id);

      // Step 1: Sync trip list with progress updates
      console.log('📋 Syncing trips...');
      const result = await syncManager.syncTrips((progress) => {
        setSyncProgress({ page: progress.page, totalSynced: progress.totalSynced });
      });

      console.log(`✅ Trips synced: ${result.totalSynced} new trips`);

      // Step 2: Sync trip details automatically after trips are synced
      console.log('🔄 Auto-syncing trip details for all trips...');
      const detailsResult = await syncManager.syncTripDetails(
        (progress) => {
          const percent = Math.round((progress.completed / progress.total) * 100);
          console.log(
            `📊 Trip details: ${progress.completed}/${progress.total} (${percent}%) - ${progress.failed} failed`
          );
        },
        {
          rateLimit: 500, // 2 req/sec
          batchSize: 1,
        }
      );

      console.log(
        `✅ Trip details synced: ${detailsResult.fetched} fetched, ${detailsResult.failed} failed`
      );

      // Show combined result message
      const pluralTrip = result.totalSynced !== 1 ? 's' : '';
      const pluralDetail = detailsResult.fetched !== 1 ? 's' : '';
      const message = `Synced ${result.totalSynced} trip${pluralTrip} and fetched details for ${detailsResult.fetched} detail${pluralDetail}`;
      addToast(message, 'success');
    } catch (error) {
      console.error('Sync error:', error);
      addToast(error instanceof Error ? error.message : 'Failed to sync trips', 'error');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Export trip data as JSON
  const exportData = async () => {
    if (!citibikeUser) return;

    try {
      // Get all trips for the user
      const dbTrips = await db.trips.where({ userId: citibikeUser.id }).toArray();

      if (dbTrips.length === 0) {
        addToast(t('toast.export.noData'), 'info');
        return;
      }

      // Convert to legacy format with readable dates
      const exportTrips = dbTrips.map((t) => ({
        ...t,
        startTime: new Date(t.startTime).toISOString(),
        endTime: new Date(t.endTime).toISOString(),
      }));

      // Create export object with metadata
      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: citibikeUser.id,
        totalTrips: exportTrips.length,
        trips: exportTrips,
        stats: stats,
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `citibike-trips-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast(t('toast.export.success'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast(error instanceof Error ? error.message : t('toast.export.failed'), 'error');
    }
  };

  // Cloud backup functions
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      addToast(error instanceof Error ? error.message : 'Failed to sign in', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      addToast(error instanceof Error ? error.message : 'Failed to sign out', 'error');
    }
  };

  const handleBackup = async () => {
    if (!citibikeUser) return;
    if (!supabaseUser) {
      addToast(t('toast.backup.failed').replace('{{error}}', 'Not authenticated'), 'error');
      return;
    }

    try {
      setIsBackingUp(true);
      addToast(t('toast.backup.started'), 'info');
      const count = await backupTripsToCloud(citibikeUser.id);
      addToast(
        t(count === 1 ? 'toast.backup.success' : 'toast.backup.success_plural', { count }),
        'success'
      );

      // Refresh cloud trip count
      const newCount = await getCloudTripCount();
      setCloudTripCount(newCount);
    } catch (error) {
      console.error('Backup error:', error);
      addToast(
        t('toast.backup.failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        'error'
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!citibikeUser) return;
    if (!supabaseUser) {
      addToast(t('toast.restore.failed').replace('{{error}}', 'Not authenticated'), 'error');
      return;
    }

    try {
      setIsRestoring(true);
      addToast(t('toast.restore.started'), 'info');
      const count = await restoreTripsFromCloud(citibikeUser.id);
      addToast(
        t(count === 1 ? 'toast.restore.success' : 'toast.restore.success_plural', { count }),
        'success'
      );
    } catch (error) {
      console.error('Restore error:', error);
      addToast(
        t('toast.restore.failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        'error'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  // Don't show if user not logged in
  if (!citibikeUser) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('tripStats.title')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            disabled={isSyncing || !citibikeUser || !stats || stats.totalTrips === 0}
            className="text-xs px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            title={t('tripStats.exportDataDescription')}
          >
            {t('tripStats.exportData')}
          </button>
          <button
            onClick={async () => {
              if (confirm(t('toast.clearData.confirm')) && citibikeUser) {
                await db.trips.where({ userId: citibikeUser.id }).delete();
                addToast(t('toast.clearData.success'), 'success');
              }
            }}
            disabled={isSyncing || !citibikeUser}
            className="text-xs px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('tripStats.clearAll')}
          </button>
          <button
            onClick={syncTrips}
            disabled={isSyncing}
            className="text-xs px-4 py-2 bg-[#0066CC] text-white rounded-md hover:bg-[#0052A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSyncing && syncProgress ? (
              <>
                {t('tripStats.page')} {syncProgress.page} ({syncProgress.totalSynced}{' '}
                {t('tripStats.trips')})
              </>
            ) : isSyncing ? (
              t('tripStats.syncing')
            ) : (
              t('tripStats.syncTrips')
            )}
          </button>
        </div>
      </div>

      {/* Cloud Backup Section */}
      {supabaseConfigured && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('tripStats.cloudBackup')}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t('tripStats.cloudBackupDescription')}
              </p>
            </div>
          </div>

          {!supabaseUser ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('tripStats.signInPrompt')}
              </p>
              <button
                onClick={handleSignIn}
                className="text-sm px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('tripStats.signInWithGoogle')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('tripStats.signedInAs', { email: supabaseUser.email ?? 'Unknown' })}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  {t('common.signOut')}
                </button>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('tripStats.cloudStatus')}:{' '}
                {t('tripStats.tripsInCloud', { count: cloudTripCount })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp || isRestoring || !stats || stats.totalTrips === 0}
                  className="flex-1 text-sm px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isBackingUp ? t('tripStats.backingUp') : t('tripStats.backupToCloud')}
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isBackingUp || isRestoring || cloudTripCount === 0}
                  className="flex-1 text-sm px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isRestoring ? t('tripStats.restoring') : t('tripStats.restoreFromCloud')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {supabaseConfigured === false && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            {t('tripStats.cloudNotConfigured')}
          </p>
        </div>
      )}

      {/* Stats Display */}
      {stats && (
        <>
          {/* No trips state */}
          {stats.totalTrips === 0 && (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('tripStats.noTrips')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('tripStats.noTripsDescription')}
              </p>
            </div>
          )}

          {/* Stats Cards */}
          {stats.totalTrips > 0 && (
            <div className="space-y-4">
              {/* Main Stats Grid - 3 columns */}
              <div className="grid grid-cols-3 gap-3">
                {/* Total Trips */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalTrips}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    {t('tripStats.totalRides')}
                  </div>
                </div>

                {/* Distance */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatDistance(stats.totalDistance)}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                    {t('tripStats.distance')}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1 opacity-75">
                    {distanceUnit === 'miles'
                      ? t('tripStats.avgSpeedMiles')
                      : t('tripStats.avgSpeedKm')}
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatDuration(stats.totalDuration)}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    {t('tripStats.rideTime')}
                  </div>
                </div>

                {/* CO2 Saved */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {formatCO2(stats.co2Saved)}
                  </div>
                  <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    {t('tripStats.co2Saved')}
                  </div>
                </div>

                {/* Money Saved */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {formatMoney(stats.moneySaved)}
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    {t('tripStats.moneySaved')}
                  </div>
                </div>

                {/* Bike Type Breakdown */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-around h-full">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stats.bikeTypeUsage.classic}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <span>{t('tripStats.bikeIcon')}</span>
                        <span>{t('tripStats.classic')}</span>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stats.bikeTypeUsage.ebike}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <span>⚡</span>
                        <span>{t('tripStats.ebike')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Stats - 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                {/* Average Trips Per Month */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg p-4">
                  <div className="text-3xl font-bold text-cyan-900 dark:text-cyan-100">
                    {tripsPerMonth.toFixed(1)}
                  </div>
                  <div className="text-sm text-cyan-700 dark:text-cyan-300 font-medium">
                    {t('tripStats.avgTripsPerMonth')}
                  </div>
                  <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 opacity-75">
                    {t('tripStats.basedOn')} {stats.totalTrips} {t('tripStats.ridesCount')}
                  </div>
                </div>

                {/* Longest Trip */}
                {longestTrip && (
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                      {formatDistance(longestTrip.distance || 0)}
                    </div>
                    <div className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                      {t('tripStats.longestTrip')}
                    </div>
                    <div className="text-xs text-rose-600 dark:text-rose-400 mt-1 opacity-75 truncate">
                      {longestTrip.startStationName} → {longestTrip.endStationName}
                    </div>
                  </div>
                )}
              </div>

              {/* Favorite Stations */}
              {stats.favoriteStartStations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {t('tripStats.topStartStations')}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.favoriteStartStations.slice(0, 6).map((station, idx) => (
                      <div
                        key={station.stationId}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-2"
                      >
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                          {idx + 1}. {station.stationName}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 ml-2">
                          {station.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Trip Count Badge */}
      {stats && stats.totalTrips > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <div>
            {stats.totalTrips} {stats.totalTrips !== 1 ? t('tripStats.trips') : 'trip'}{' '}
            {t('tripStats.storedLocally')}
          </div>
          <div className="text-[10px] opacity-75">
            {distanceUnit === 'miles'
              ? t('tripStats.distanceEstimatedMiles')
              : t('tripStats.distanceEstimatedKm')}
          </div>
        </div>
      )}
    </div>
  );
}
