'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  TrendingUp,
  Calendar,
  MapPin,
  Leaf,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Bike,
  Zap,
} from 'lucide-react';
import type { Trip, TripStats } from '@/lib/types';
import { db } from '@/lib/db';
import { useAppStore } from '@/lib/store';
import {
  calculateTripStats,
  formatDuration,
  formatMoney,
  formatCO2,
  getAverageTripDuration,
  getAverageTripDistance,
  getMostFrequentRoute,
} from '@/lib/stats';
import { useI18n } from '@/lib/i18n';

type TimeFilter = 'all' | 'week' | 'month' | 'year';

export default function TripHistory() {
  const { t, formatDistance } = useI18n();
  const { citibikeUser } = useAppStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<TripStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    patterns: false,
    favorites: false,
    recent: true,
  });

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, citibikeUser]);

  const loadTrips = async () => {
    if (!citibikeUser) {
      setTrips([]);
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = db.trips.where({ userId: citibikeUser.id });

      if (timeFilter !== 'all') {
        const now = Date.now();
        let startTime: number;

        switch (timeFilter) {
          case 'week':
            startTime = now - 7 * 24 * 60 * 60 * 1000;
            break;
          case 'month':
            startTime = now - 30 * 24 * 60 * 60 * 1000;
            break;
          case 'year':
            startTime = now - 365 * 24 * 60 * 60 * 1000;
            break;
          default:
            startTime = 0;
        }

        // Use compound index for efficient date range queries
        query = db.trips
          .where('[userId+startTime]')
          .between([citibikeUser.id, startTime], [citibikeUser.id, now]);
      }

      const dbTrips = await query.toArray();

      // Convert DB trips to legacy Trip format
      const loadedTrips: Trip[] = dbTrips.map((t) => ({
        ...t,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime),
      }));

      setTrips(loadedTrips);
      setStats(calculateTripStats(loadedTrips));
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('tripHistory.loading')}</p>
      </div>
    );
  }

  if (!stats || trips.length === 0) {
    return (
      <div className="p-6 text-center">
        <Activity className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('tripHistory.noTrips')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('tripHistory.noTripsDescription')}
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          {t('tripHistory.noTripsSubtext')}
        </div>
      </div>
    );
  }

  const mostFrequentRoute = getMostFrequentRoute(trips);
  const avgDuration = getAverageTripDuration(trips);
  const avgDistance = getAverageTripDistance(trips);

  return (
    <div className="h-full overflow-y-auto">
      {/* Time Filter */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          {(['all', 'week', 'month', 'year'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {filter === 'all'
                ? t('tripHistory.allTime')
                : t('tripHistory.last', { period: filter })}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview Section */}
        <section>
          <button
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              {t('tripHistory.overview')}
            </h3>
            {expandedSections.overview ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.overview && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('tripHistory.totalTrips')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalTrips.toLocaleString()}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('tripHistory.distance')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatDistance(stats.totalDistance)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {t('tripHistory.avg')}: {formatDistance(avgDistance)}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('tripHistory.time')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(stats.totalDuration)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {t('tripHistory.avg')}: {formatDuration(avgDuration)}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="w-4 h-4 text-green-600 dark:text-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('tripHistory.co2Saved')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCO2(stats.co2Saved)}
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('tripHistory.moneySaved')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatMoney(stats.moneySaved)}
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Bike className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('tripHistory.bikeType')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {stats.bikeTypeUsage.classic}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {t('tripHistory.classic')}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {stats.bikeTypeUsage.ebike}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {t('tripHistory.ebike')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Riding Patterns Section */}
        <section>
          <button
            onClick={() => toggleSection('patterns')}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              {t('tripHistory.ridingPatterns')}
            </h3>
            {expandedSections.patterns ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.patterns && (
            <div className="space-y-4">
              {/* Day of Week */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tripHistory.byDayOfWeek')}
                </h4>
                <div className="space-y-2">
                  {Object.entries(stats.ridingPatterns.byDayOfWeek)
                    .sort(([, a], [, b]) => b - a)
                    .map(([day, count]) => {
                      const percentage = (count / stats.totalTrips) * 100;
                      return (
                        <div key={day} className="flex items-center gap-2">
                          <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                            {day.slice(0, 3)}
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-8 text-xs text-gray-600 dark:text-gray-400 text-right">
                            {count}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Most Frequent Route */}
              {mostFrequentRoute && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tripHistory.mostFrequentRoute')}
                  </h4>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {mostFrequentRoute.startStationName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 my-1">↓</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {mostFrequentRoute.endStationName}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                    {t('tripHistory.tripsCount', { count: mostFrequentRoute.count })}
                  </div>
                </div>
              )}
              {/* Note about filtered data */}
              {trips.filter(
                (t) =>
                  !t.startStationName ||
                  t.startStationName === 'Unknown' ||
                  !t.endStationName ||
                  t.endStationName === 'Unknown'
              ).length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-500 italic mt-2">
                  {t('tripHistory.excludes')}{' '}
                  {
                    trips.filter(
                      (t) =>
                        !t.startStationName ||
                        t.startStationName === 'Unknown' ||
                        !t.endStationName ||
                        t.endStationName === 'Unknown'
                    ).length
                  }{' '}
                  {t('tripHistory.tripsWithUnknownData')}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Favorite Stations Section */}
        <section>
          <button
            onClick={() => toggleSection('favorites')}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              {t('tripHistory.favoriteStations')}
            </h3>
            {expandedSections.favorites ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.favorites && (
            <div className="space-y-3">
              {/* Top Start Stations */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tripHistory.mostUsedStartStations')}
                </h4>
                <div className="space-y-2">
                  {stats.favoriteStartStations.slice(0, 5).map((station) => (
                    <div
                      key={station.stationId}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {station.stationName}
                        </div>
                      </div>
                      <div className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                        {station.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top End Stations */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tripHistory.mostUsedEndStations')}
                </h4>
                <div className="space-y-2">
                  {stats.favoriteEndStations.slice(0, 5).map((station) => (
                    <div
                      key={station.stationId}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {station.stationName}
                        </div>
                      </div>
                      <div className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                        {station.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Recent Trips Section */}
        <section>
          <button
            onClick={() => toggleSection('recent')}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              {t('tripHistory.recentTrips')}
            </h3>
            {expandedSections.recent ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.recent && (
            <div className="space-y-2">
              {trips
                .slice()
                .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                .slice(0, 10)
                .map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {trip.startTime.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          {t('tripHistory.at')}{' '}
                          {trip.startTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {trip.startStationName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 my-1">↓</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {trip.endStationName}
                        </div>
                      </div>
                      <div className="ml-2 flex items-center">
                        {trip.bikeType === 'ebike' ? (
                          <Zap className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Bike className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span>{formatDuration(trip.duration)}</span>
                      {trip.distance && (
                        <>
                          <span>•</span>
                          <span>{formatDistance(trip.distance)}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
