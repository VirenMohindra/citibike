'use client';

/**
 * Route Popularity Component
 * Shows how popular a specific route is based on aggregate public data
 */

import { useRoutePopularity } from '@/lib/db/hooks/usePublicTripStats';

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
  const { popularity, isLoading, error } = useRoutePopularity(startStationId, endStationId);

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading route data...</p>
      </div>
    );
  }

  if (error || !popularity) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This route hasn&apos;t been recorded in the public data yet. It might be a new or
          rarely-used route.
        </p>
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
      {/* Popularity Badge */}
      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${popularityColor} bg-gray-50 dark:bg-gray-800`}
        >
          {popularityLabel}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {popularity.tripCount.toLocaleString()} total trips recorded
        </span>
      </div>

      {/* Route Details */}
      {showDetails && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">Route Statistics</h4>

          {/* Average Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">Avg Duration</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.avgDuration.toFixed(1)} min
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Avg Distance</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.avgDistance.toFixed(2)} mi
              </div>
            </div>
          </div>

          {/* Bike Type & Member Breakdown */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-gray-600 dark:text-gray-400">E-bike Usage</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.ebikePercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Member Usage</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {popularity.memberPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Popular Times */}
          {popularity.popularTimes.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Most Popular Times
              </div>
              <div className="space-y-1">
                {popularity.popularTimes
                  .filter((t) => t.count > 0)
                  .slice(0, 3)
                  .map((time) => {
                    const timeLabel = {
                      morning_rush: 'Morning Rush (7-10am)',
                      midday: 'Midday (10am-4pm)',
                      evening_rush: 'Evening Rush (4-8pm)',
                      night: 'Night (8pm-7am)',
                    }[time.timeOfDay];

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
                            {time.percent.toFixed(0)}%
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
            🔥 This is one of the most popular routes! Expect consistent bike availability at both
            stations.
          </p>
        )}
        {popularityLevel === 'popular' && (
          <p className="text-gray-700 dark:text-gray-300">
            ✅ This is a well-traveled route with reliable service patterns.
          </p>
        )}
        {popularityLevel === 'moderate' && (
          <p className="text-gray-700 dark:text-gray-300">
            💡 This route has moderate usage. Check real-time availability during peak hours.
          </p>
        )}
        {popularityLevel === 'rare' && (
          <p className="text-gray-700 dark:text-gray-300">
            🌟 You&apos;re pioneering a less-common route! Double-check bike availability before
            heading out.
          </p>
        )}
      </div>
    </div>
  );
}
