'use client';

/**
 * Benchmarking Dashboard
 * Compares personal trip data with aggregate public trip statistics
 */

import { useMemo } from 'react';
import {
  usePublicTripStats,
  useBikeTypeAnalysis,
  useTimeOfDayPatterns,
} from '@/lib/db/hooks/usePublicTripStats';
import type { Trip } from '@/lib/db/schema';
import { useI18n } from '@/lib/i18n';

// Map snake_case time values to camelCase translation keys
const TIME_OF_DAY_KEYS = {
  morning_rush: 'benchmarkingDashboard.timeOfDay.morningRush',
  midday: 'benchmarkingDashboard.timeOfDay.midday',
  evening_rush: 'benchmarkingDashboard.timeOfDay.eveningRush',
  night: 'benchmarkingDashboard.timeOfDay.night',
} as const;

interface BenchmarkingDashboardProps {
  personalTrips: Trip[];
  userId: string;
}

export default function BenchmarkingDashboard({ personalTrips }: BenchmarkingDashboardProps) {
  const { t } = useI18n();
  const { stats: publicStats, isLoading: publicLoading } = usePublicTripStats();
  const { analysis: bikeTypeAnalysis, isLoading: bikeTypeLoading } = useBikeTypeAnalysis();
  const { patterns: timePatterns, isLoading: timeLoading } = useTimeOfDayPatterns();

  // Calculate personal statistics
  const personalStats = useMemo(() => {
    if (personalTrips.length === 0) {
      return null;
    }

    const ebikeTrips = personalTrips.filter((t) => t.bikeType === 'ebike');
    const avgDuration =
      personalTrips.reduce((sum, t) => sum + t.duration, 0) / personalTrips.length;
    const avgDistance =
      personalTrips.reduce((sum, t) => sum + (t.distance || 0), 0) / personalTrips.length;

    // Time of day distribution
    const timeDistribution = {
      morning_rush: 0,
      midday: 0,
      evening_rush: 0,
      night: 0,
    };

    personalTrips.forEach((trip) => {
      const hour = new Date(trip.startTime).getHours();
      let timeOfDay: keyof typeof timeDistribution;

      if (hour >= 7 && hour < 10) timeOfDay = 'morning_rush';
      else if (hour >= 10 && hour < 16) timeOfDay = 'midday';
      else if (hour >= 16 && hour < 20) timeOfDay = 'evening_rush';
      else timeOfDay = 'night';

      timeDistribution[timeOfDay]++;
    });

    return {
      totalTrips: personalTrips.length,
      ebikePercent: (ebikeTrips.length / personalTrips.length) * 100,
      avgDurationMinutes: avgDuration / 60,
      avgDistanceMiles: avgDistance / 1609.34,
      timeDistribution,
    };
  }, [personalTrips]);

  if (publicLoading || bikeTypeLoading || timeLoading) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">{t('benchmarkingDashboard.loading')}</p>
      </div>
    );
  }

  if (!publicStats?.hasData) {
    return (
      <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {t('benchmarkingDashboard.noPublicData.title')}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {t('benchmarkingDashboard.noPublicData.description')}
        </p>
        <a href="/analysis/import" className="text-blue-600 hover:underline dark:text-blue-400">
          {t('benchmarkingDashboard.noPublicData.linkText')}
        </a>
      </div>
    );
  }

  if (!personalStats || personalTrips.length === 0) {
    return (
      <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {t('benchmarkingDashboard.noPersonalTrips.title')}
        </h3>
        <p className="text-gray-700 dark:text-gray-300">
          {t('benchmarkingDashboard.noPersonalTrips.description')}
        </p>
      </div>
    );
  }

  // Calculate comparisons
  const ebikeComparison = personalStats.ebikePercent - publicStats.bikeTypes!.ebikePercent;
  const durationComparison =
    personalStats.avgDurationMinutes - publicStats.averages!.durationMinutes;
  const distanceComparison = personalStats.avgDistanceMiles - publicStats.averages!.distanceMiles;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('benchmarkingDashboard.header.title')}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('benchmarkingDashboard.header.subtitle', {
            personalTrips: personalStats.totalTrips.toLocaleString(),
            publicTrips: publicStats.totalTrips.toLocaleString(),
          })}
        </p>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* E-bike Usage */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('benchmarkingDashboard.stats.ebikeUsage.label')}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {personalStats.ebikePercent.toFixed(1)}{t('benchmarkingDashboard.units.percent')}
          </div>
          <div
            className={`text-sm mt-1 ${
              ebikeComparison > 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {ebikeComparison > 0 ? '+' : ''}
            {ebikeComparison.toFixed(1)}{t('benchmarkingDashboard.units.percent')}{' '}
            {t('benchmarkingDashboard.comparison.vsAverage')} (
            {publicStats.bikeTypes!.ebikePercent.toFixed(1)}
            {t('benchmarkingDashboard.units.percent')})
          </div>
        </div>

        {/* Average Duration */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('benchmarkingDashboard.stats.avgDuration.label')}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {personalStats.avgDurationMinutes.toFixed(1)} {t('benchmarkingDashboard.units.minutes')}
          </div>
          <div
            className={`text-sm mt-1 ${
              Math.abs(durationComparison) < 2
                ? 'text-gray-600 dark:text-gray-400'
                : durationComparison > 0
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-green-600 dark:text-green-400'
            }`}
          >
            {durationComparison > 0 ? '+' : ''}
            {durationComparison.toFixed(1)} {t('benchmarkingDashboard.units.minutes')}{' '}
            {t('benchmarkingDashboard.comparison.vsAverage')} (
            {publicStats.averages!.durationMinutes.toFixed(1)} {t('benchmarkingDashboard.units.minutes')})
          </div>
        </div>

        {/* Average Distance */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('benchmarkingDashboard.stats.avgDistance.label')}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {personalStats.avgDistanceMiles.toFixed(2)} {t('benchmarkingDashboard.units.miles')}
          </div>
          <div
            className={`text-sm mt-1 ${
              Math.abs(distanceComparison) < 0.1
                ? 'text-gray-600 dark:text-gray-400'
                : distanceComparison > 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {distanceComparison > 0 ? '+' : ''}
            {distanceComparison.toFixed(2)} {t('benchmarkingDashboard.units.miles')}{' '}
            {t('benchmarkingDashboard.comparison.vsAverage')} (
            {publicStats.averages!.distanceMiles.toFixed(2)} {t('benchmarkingDashboard.units.miles')})
          </div>
        </div>
      </div>

      {/* Time of Day Comparison */}
      {timePatterns && timePatterns.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {t('benchmarkingDashboard.ridingPatterns.title')}
          </h3>
          <div className="space-y-3">
            {timePatterns.map((pattern) => {
              const personalCount =
                personalStats.timeDistribution[
                  pattern.timeOfDay as keyof typeof personalStats.timeDistribution
                ] || 0;
              const personalPercent = (personalCount / personalStats.totalTrips) * 100;
              const difference = personalPercent - pattern.percent;

              const timeLabel = t(
                TIME_OF_DAY_KEYS[pattern.timeOfDay as keyof typeof TIME_OF_DAY_KEYS]
              );

              return (
                <div key={pattern.timeOfDay}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {timeLabel}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('benchmarkingDashboard.ridingPatterns.you')} {personalPercent.toFixed(1)}
                      {t('benchmarkingDashboard.units.percent')} |{' '}
                      {t('benchmarkingDashboard.ridingPatterns.average')} {pattern.percent.toFixed(1)}
                      {t('benchmarkingDashboard.units.percent')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {/* Your usage bar */}
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                        style={{ width: `${personalPercent}%` }}
                      />
                    </div>
                    {/* Average bar */}
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gray-400 dark:bg-gray-600 h-2 rounded-full"
                        style={{ width: `${pattern.percent}%` }}
                      />
                    </div>
                  </div>
                  {Math.abs(difference) > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {difference > 0
                        ? t('benchmarkingDashboard.ridingPatterns.moreUsage', {
                            difference: difference.toFixed(1),
                          })
                        : t('benchmarkingDashboard.ridingPatterns.lessUsage', {
                            difference: Math.abs(difference).toFixed(1),
                          })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bike Type Deep Dive */}
      {bikeTypeAnalysis && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {t('benchmarkingDashboard.bikeTypeComparison.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* E-bike stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('benchmarkingDashboard.bikeTypeComparison.ebike.title')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('benchmarkingDashboard.bikeTypeComparison.avgDuration')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bikeTypeAnalysis.ebike.avgDuration.toFixed(1)}{' '}
                    {t('benchmarkingDashboard.units.minutes')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('benchmarkingDashboard.bikeTypeComparison.avgDistance')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bikeTypeAnalysis.ebike.avgDistance.toFixed(2)}{' '}
                    {t('benchmarkingDashboard.units.miles')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('benchmarkingDashboard.bikeTypeComparison.memberUsage')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bikeTypeAnalysis.ebike.memberPercent.toFixed(1)}
                    {t('benchmarkingDashboard.units.percent')}
                  </span>
                </div>
              </div>
            </div>

            {/* Classic stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('benchmarkingDashboard.bikeTypeComparison.classic.title')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('benchmarkingDashboard.bikeTypeComparison.avgDuration')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bikeTypeAnalysis.classic.avgDuration.toFixed(1)}{' '}
                    {t('benchmarkingDashboard.units.minutes')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('benchmarkingDashboard.bikeTypeComparison.avgDistance')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bikeTypeAnalysis.classic.avgDistance.toFixed(2)}{' '}
                    {t('benchmarkingDashboard.units.miles')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('benchmarkingDashboard.bikeTypeComparison.memberUsage')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {bikeTypeAnalysis.classic.memberPercent.toFixed(1)}
                    {t('benchmarkingDashboard.units.percent')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-gray-700 dark:text-gray-300">
            {t('benchmarkingDashboard.insights.ebikeDistance', {
              percentage: (
                ((bikeTypeAnalysis.ebike.avgDistance - bikeTypeAnalysis.classic.avgDistance) /
                  bikeTypeAnalysis.classic.avgDistance) *
                100
              ).toFixed(0),
            })}
          </div>
        </div>
      )}
    </div>
  );
}
