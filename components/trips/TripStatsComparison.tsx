'use client';

import { useMemo } from 'react';
import type { Trip } from '@/lib/db/schema';
import type { TripComparison } from '@/lib/db/hooks';
import { formatDuration } from '@/lib/stats';
import { useI18n } from '@/lib/i18n';

interface TripStatsComparisonProps {
  trip: Trip;
  comparison: TripComparison;
}

type ComparisonType = 'higher' | 'lower' | 'equal';

interface ComparisonStat {
  label: string;
  value: string;
  comparisonValue: string;
  type: ComparisonType;
  percentageDiff: number;
}

export function TripStatsComparison({ trip, comparison }: TripStatsComparisonProps) {
  const { t, formatDistance } = useI18n();

  const stats = useMemo<ComparisonStat[]>(() => {
    if (comparison.totalTrips <= 1) return [];

    const results: ComparisonStat[] = [];

    // Duration comparison
    const durationDiff =
      ((trip.duration - comparison.averageDuration) / comparison.averageDuration) * 100;
    results.push({
      label: t('tripComparison.vsAvgDuration'),
      value: formatDuration(trip.duration),
      comparisonValue: formatDuration(Math.round(comparison.averageDuration)),
      type: durationDiff > 5 ? 'higher' : durationDiff < -5 ? 'lower' : 'equal',
      percentageDiff: Math.abs(durationDiff),
    });

    // Distance comparison (only if trip has distance)
    if (trip.distance && trip.distance > 0 && comparison.averageDistance > 0) {
      const distanceDiff =
        ((trip.distance - comparison.averageDistance) / comparison.averageDistance) * 100;
      results.push({
        label: t('tripComparison.vsAvgDistance'),
        value: formatDistance(trip.distance),
        comparisonValue: formatDistance(Math.round(comparison.averageDistance)),
        type: distanceDiff > 5 ? 'higher' : distanceDiff < -5 ? 'lower' : 'equal',
        percentageDiff: Math.abs(distanceDiff),
      });
    }

    return results;
  }, [trip, comparison, t, formatDistance]);

  // Calculate records
  const records = useMemo(() => {
    const results: string[] = [];

    if (comparison.totalTrips <= 1) return results;

    // Check if this is the longest trip
    if (trip.duration === comparison.longestDuration) {
      results.push(t('tripComparison.recordLongestDuration'));
    }

    // Check if this is the shortest trip
    if (trip.duration === comparison.shortestDuration) {
      results.push(t('tripComparison.recordShortestDuration'));
    }

    // Check distance records (only if trip has distance)
    if (trip.distance && trip.distance > 0) {
      if (trip.distance === comparison.longestDistance) {
        results.push(t('tripComparison.recordLongestDistance'));
      }
      if (trip.distance === comparison.shortestDistance) {
        results.push(t('tripComparison.recordShortestDistance'));
      }
    }

    return results;
  }, [trip, comparison, t]);

  // Don't show if only 1 trip
  if (comparison.totalTrips <= 1) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        {t('tripComparison.title')}
      </h3>

      {/* Comparison Stats */}
      <div className="space-y-2">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stat.value}</p>
            </div>
            <div className="flex items-center gap-2">
              {stat.type === 'higher' && (
                <div className="flex items-center text-orange-600 dark:text-orange-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                  <span className="text-xs font-medium ml-1">
                    {stat.percentageDiff.toFixed(0)}
                    {t('tripComparison.percentage')}
                  </span>
                </div>
              )}
              {stat.type === 'lower' && (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                  <span className="text-xs font-medium ml-1">
                    {stat.percentageDiff.toFixed(0)}
                    {t('tripComparison.percentage')}
                  </span>
                </div>
              )}
              {stat.type === 'equal' && (
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14"
                    />
                  </svg>
                  <span className="text-xs font-medium ml-1">{t('tripComparison.average')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Records */}
      {records.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-lg" role="img" aria-label="trophy">
              {t('tripComparison.trophy')}
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                {t('tripComparison.records')}
              </p>
              <ul className="space-y-0.5">
                {records.map((record, index) => (
                  <li key={index} className="text-xs text-gray-700 dark:text-gray-300">
                    • {record}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Context */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('tripComparison.basedOn', { count: comparison.totalTrips })}
        </p>
      </div>
    </div>
  );
}
