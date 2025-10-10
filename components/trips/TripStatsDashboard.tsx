'use client';

import { useStationUsage, useTripPatterns } from '@/lib/db/hooks';
import { useI18n } from '@/lib/i18n';

interface TripStatsDashboardProps {
  userId: string | null;
}

export default function TripStatsDashboard({ userId }: TripStatsDashboardProps) {
  const { t } = useI18n();
  const stationUsage = useStationUsage(userId, 10);
  const patterns = useTripPatterns(userId);

  if (!userId || !stationUsage || !patterns) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {t('tripStatsDashboard.noStats')}
      </div>
    );
  }

  // Find peak hours and days
  const peakHour = patterns.byHourOfDay.reduce((max, item) =>
    item.count > max.count ? item : max
  );
  const peakDay = patterns.byDayOfWeek.reduce((max, item) => (item.count > max.count ? item : max));

  // Format hour for display (12-hour format)
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Get max count for scaling bars
  const maxHourCount = Math.max(...patterns.byHourOfDay.map((h) => h.count));
  const maxDayCount = Math.max(...patterns.byDayOfWeek.map((d) => d.count));
  const maxMonthCount = Math.max(...patterns.byMonth.map((m) => m.count));

  return (
    <div className="space-y-6">
      {/* Most Used Stations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('tripStatsDashboard.mostUsedStations')}
        </h3>
        <div className="space-y-3">
          {stationUsage.slice(0, 5).map((station, index) => (
            <div key={station.stationId} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {station.stationName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {station.startCount} {t('tripStatsDashboard.startsEnds')} {station.endCount}{' '}
                  {t('tripStatsDashboard.ends')}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {station.totalCount} {t('tripStatsDashboard.tripsLower')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite Routes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('tripStatsDashboard.favoriteRoutes')}
        </h3>
        <div className="space-y-3">
          {patterns.favoriteRoutes.slice(0, 5).map((route, index) => (
            <div
              key={`${route.startStation}-${route.endStation}`}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{route.startStation}</span>
                  <span className="mx-2 text-gray-400 dark:text-gray-500">→</span>
                  <span className="font-medium">{route.endStation}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  {route.count}×
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time of Day Pattern */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('tripStatsDashboard.usageByTimeOfDay')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('tripStatsDashboard.peak')} {formatHour(peakHour.hour)} ({peakHour.count}{' '}
            {t('tripStatsDashboard.trips')})
          </span>
        </div>
        <div className="space-y-2">
          {patterns.byHourOfDay.map(({ hour, count }) => {
            const width = maxHourCount > 0 ? (count / maxHourCount) * 100 : 0;
            return (
              <div key={hour} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-600 dark:text-gray-400 text-right">
                  {formatHour(hour)}
                </div>
                <div className="flex-1 relative h-6 bg-gray-100 dark:bg-gray-700 rounded">
                  {count > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-600 rounded flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${width}%` }}
                    >
                      {count > 0 && width > 15 && (
                        <span className="text-xs font-medium text-white">{count}</span>
                      )}
                    </div>
                  )}
                </div>
                {count > 0 && width <= 15 && (
                  <span className="w-8 text-xs text-gray-600 dark:text-gray-400">{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day of Week Pattern */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('tripStatsDashboard.usageByDayOfWeek')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('tripStatsDashboard.peak')} {peakDay.dayName} ({peakDay.count}{' '}
            {t('tripStatsDashboard.trips')})
          </span>
        </div>
        <div className="space-y-2">
          {patterns.byDayOfWeek.map(({ day, dayName, count }) => {
            const width = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0;
            return (
              <div key={day} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                  {dayName}
                </div>
                <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
                  {count > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-purple-500 dark:bg-purple-600 rounded flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${width}%` }}
                    >
                      {count > 0 && width > 15 && (
                        <span className="text-sm font-medium text-white">{count}</span>
                      )}
                    </div>
                  )}
                </div>
                {count > 0 && width <= 15 && (
                  <span className="w-10 text-sm text-gray-600 dark:text-gray-400">{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('tripStatsDashboard.monthlyTrends')}
        </h3>
        <div className="space-y-2">
          {patterns.byMonth.map(({ month, count }) => {
            const width = maxMonthCount > 0 ? (count / maxMonthCount) * 100 : 0;
            // Format month as "Jan 2025"
            const [year, monthNum] = month.split('-');
            const monthNames = [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ];
            const monthName = monthNames[parseInt(monthNum, 10) - 1];
            const label = `${monthName} ${year}`;

            return (
              <div key={month} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                  {label}
                </div>
                <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
                  {count > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-600 rounded flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${width}%` }}
                    >
                      {count > 0 && width > 15 && (
                        <span className="text-sm font-medium text-white">{count}</span>
                      )}
                    </div>
                  )}
                </div>
                {count > 0 && width <= 15 && (
                  <span className="w-10 text-sm text-gray-600 dark:text-gray-400">{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
