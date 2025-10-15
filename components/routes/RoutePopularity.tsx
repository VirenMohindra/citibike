'use client';

/**
 * Route Popularity Component
 * Shows how popular a specific route is based on aggregate public data
 */

import { useRoutePopularity } from '@/lib/db/hooks/usePublicTripStats';
import { useI18n } from '@/lib/i18n';

// Map time values to translation keys
const TIME_LABEL_KEYS = {
  morning_rush: 'routePopularity.timeLabels.morning_rush',
  midday: 'routePopularity.timeLabels.midday',
  evening_rush: 'routePopularity.timeLabels.evening_rush',
  night: 'routePopularity.timeLabels.night',
} as const;

interface RoutePopularityProps {
  startStationId: string;
  startStationName: string;
  endStationId: string;
  endStationName: string;
  showDetails?: boolean;
}

export default function RoutePopularity({
  startStationId,
  startStationName,
  endStationId,
  endStationName,
  showDetails = true,
}: RoutePopularityProps) {
  const { t } = useI18n();
  const { popularity, isLoading, error } = useRoutePopularity(startStationId, endStationId);

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('routePopularity.loading')}</p>
      </div>
    );
  }

  if (error || !popularity) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-gray-700 dark:text-gray-300">{t('routePopularity.noData')}</p>
      </div>
    );
  }

  // Determine popularity level
  let popularityLevel: 'very_popular' | 'popular' | 'moderate' | 'rare';
  let popularityColor: string;
  let popularityLabel: string;

  if (popularity.tripCount > 1000) {
    popularityLevel = 'very_popular';
    popularityColor = 'text-green-600 dark:text-green-400';
    popularityLabel = 'Very Popular';
  } else if (popularity.tripCount > 500) {
    popularityLevel = 'popular';
    popularityColor = 'text-blue-600 dark:text-blue-400';
    popularityLabel = 'Popular';
  } else if (popularity.tripCount > 100) {
    popularityLevel = 'moderate';
    popularityColor = 'text-yellow-600 dark:text-yellow-400';
    popularityLabel = 'Moderate';
  } else {
    popularityLevel = 'rare';
    popularityColor = 'text-gray-600 dark:text-gray-400';
    popularityLabel = 'Rarely Used';
  }

  return (
    <div className="space-y-4">
      {/* Route Header */}
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {startStationName} → {endStationName}
        </h3>
      </div>

      {/* Popularity Badge */}
      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${popularityColor} bg-gray-50 dark:bg-gray-800`}
        >
          {popularityLabel}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {popularity.tripCount.toLocaleString()} {t('routePopularity.totalTripsRecorded')}
        </span>
      </div>

      {/* Route Details */}
      {showDetails && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {t('routePopularity.statistics')}
          </h4>

          {/* Average Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('routePopularity.avgDuration')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.avgDuration.toFixed(1)} {t('routePopularity.minutes')}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('routePopularity.avgDistance')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.avgDistance.toFixed(2)} {t('routePopularity.miles')}
              </div>
            </div>
          </div>

          {/* Bike Type & Member Breakdown */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('routePopularity.ebikeUsage')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.ebikePercent.toFixed(1)}
                {t('routePopularity.percent')}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('routePopularity.memberUsage')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.memberPercent.toFixed(1)}
                {t('routePopularity.percent')}
              </div>
            </div>
          </div>

          {/* Popular Times */}
          {popularity.popularTimes.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('routePopularity.mostPopularTimes')}
              </div>
              <div className="space-y-1">
                {popularity.popularTimes
                  .filter((t) => t.count > 0)
                  .slice(0, 3)
                  .map((time) => {
                    const timeLabel = t(
                      TIME_LABEL_KEYS[time.timeOfDay as keyof typeof TIME_LABEL_KEYS]
                    );

                    return (
                      <div
                        key={time.timeOfDay}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-600 dark:text-gray-400">{timeLabel}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${time.percent}%` }}
                            />
                          </div>
                          <span className="text-gray-900 dark:text-white font-medium w-12 text-right">
                            {time.percent.toFixed(0)}
                            {t('routePopularity.percent')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        {popularityLevel === 'very_popular' && (
          <p className="text-gray-700 dark:text-gray-300">
            {t('routePopularity.insights.veryPopular')}
          </p>
        )}
        {popularityLevel === 'popular' && (
          <p className="text-gray-700 dark:text-gray-300">
            {t('routePopularity.insights.popular')}
          </p>
        )}
        {popularityLevel === 'moderate' && (
          <p className="text-gray-700 dark:text-gray-300">
            {t('routePopularity.insights.moderate')}
          </p>
        )}
        {popularityLevel === 'rare' && (
          <p className="text-gray-700 dark:text-gray-300">{t('routePopularity.insights.rare')}</p>
        )}
      </div>
    </div>
  );
}
