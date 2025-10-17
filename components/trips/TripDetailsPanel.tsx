'use client';

import { useMemo } from 'react';
import type { Trip } from '@/lib/db/schema';
import { formatDuration } from '@/lib/stats';
import { useI18n } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { useTripComparison } from '@/lib/db/hooks';
import { TripStatsComparison } from './TripStatsComparison';

interface TripDetailsPanelProps {
  trip: Trip | null;
}

export default function TripDetailsPanel({ trip }: TripDetailsPanelProps) {
  const { t, formatDistance, formatCurrency } = useI18n();
  const distanceUnit = useAppStore((state) => state.distanceUnit);
  const citibikeUser = useAppStore((state) => state.citibikeUser);
  const tripComparison = useTripComparison(citibikeUser?.id || null);

  // Format date and time
  const formattedDate = useMemo(() => {
    if (!trip) return '';
    const date = new Date(trip.startTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [trip]);

  const formattedTime = useMemo(() => {
    if (!trip) return '';
    const start = new Date(trip.startTime);
    const end = new Date(trip.endTime);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }, [trip]);

  // Calculate average speed if distance is available
  const averageSpeed = useMemo(() => {
    if (!trip || !trip.distance || trip.distance === 0 || trip.duration === 0) {
      return null;
    }
    const metersPerSecond = trip.distance / trip.duration;

    if (distanceUnit === 'miles') {
      // Convert m/s to mph: (meters / seconds) * 2.237
      const mph = metersPerSecond * 2.237;
      return `${mph.toFixed(1)} mph`;
    } else {
      // Convert m/s to km/h: (meters / seconds) * 3.6
      const kmh = metersPerSecond * 3.6;
      return `${kmh.toFixed(1)} km/h`;
    }
  }, [trip, distanceUnit]);

  // Calculate environmental impact (CO₂ saved)
  const co2Saved = useMemo(() => {
    if (!trip || !trip.distance) return 0;
    // Average car emits 404g CO₂ per mile
    // 1 mile = 1609.34 meters
    const miles = trip.distance / 1609.34;
    const grams = miles * 404;
    return Math.round(grams);
  }, [trip]);

  if (!trip) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-gray-500 dark:text-gray-400">{t('tripDetailsPanel.selectToView')}</p>
        </div>
      </div>
    );
  }

  const hasStationInfo = trip.startStationName && trip.startStationName !== 'Unknown';

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('tripDetailsPanel.title')}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Date and Time Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('tripDetailsPanel.dateTime')}
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-900 dark:text-gray-100">{formattedDate}</p>
            <p className="text-gray-600 dark:text-gray-400">{formattedTime}</p>
          </div>
        </div>

        {/* Trip Stats Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('tripDetailsPanel.tripStats')}
          </h3>
          <div className="space-y-3">
            {/* Duration */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('tripDetailsPanel.duration')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatDuration(trip.duration)}
              </span>
            </div>

            {/* Distance */}
            {trip.distance && trip.distance > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('tripDetailsPanel.distance')}{' '}
                  {!trip.hasActualCoordinates && (
                    <span className="text-xs">{t('tripDetailsPanel.estimated')}</span>
                  )}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDistance(trip.distance)}
                </span>
              </div>
            )}

            {/* Average Speed */}
            {averageSpeed && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('tripDetailsPanel.avgSpeed')}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {averageSpeed}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bike Details Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('tripDetailsPanel.bikeDetails')}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{trip.bikeType === 'ebike' ? '⚡' : '🚲'}</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                {trip.bikeType === 'ebike'
                  ? t('tripDetailsPanel.electricBike')
                  : t('tripDetailsPanel.classicBike')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {trip.bikeType === 'ebike'
                  ? t('tripDetailsPanel.pedalAssist')
                  : t('tripDetailsPanel.standardBike')}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Section */}
        {trip.cost !== undefined && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('tripDetailsPanel.cost')}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('tripDetailsPanel.amountPaid')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(trip.cost / 100)}
              </span>
            </div>
          </div>
        )}

        {/* Angel Points Section */}
        {trip.angelPoints && trip.angelPoints > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⭐</span>
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                {t('tripDetailsPanel.bikeAngelPoints')}
              </h3>
            </div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              +{trip.angelPoints} {t('tripDetailsPanel.pointsLower')}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
              {t('tripDetailsPanel.earnedForBalancing')}
            </p>
          </div>
        )}

        {/* Environmental Impact Section */}
        {co2Saved > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🌱</span>
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                {t('tripDetailsPanel.environmentalImpact')}
              </h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('tripDetailsPanel.co2Saved')}
                </p>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{co2Saved}g</p>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {t('tripDetailsPanel.co2TreeEquivalent', { hours: Math.round(co2Saved / 21.77) })}
              </p>
            </div>
          </div>
        )}

        {/* Trip Stats Comparison */}
        {tripComparison && tripComparison.totalTrips > 1 && (
          <TripStatsComparison trip={trip} comparison={tripComparison} />
        )}

        {/* Station Info Section */}
        {hasStationInfo && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('tripDetailsPanel.stations')}
            </h3>
            <div className="space-y-3">
              {/* Start Station */}
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-1">●</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t('tripDetailsPanel.start')}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {trip.startStationName}
                  </p>
                  {trip.startLat !== 0 && trip.startLon !== 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {trip.startLat.toFixed(6)}, {trip.startLon.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* End Station */}
              <div className="flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400 mt-1">●</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t('tripDetailsPanel.end')}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{trip.endStationName}</p>
                  {trip.endLat !== 0 && trip.endLon !== 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {trip.endLat.toFixed(6)}, {trip.endLon.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Source Indicator */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {trip.hasActualCoordinates
              ? t('tripDetailsPanel.routeDataFromDetails')
              : distanceUnit === 'miles'
                ? t('tripDetailsPanel.distanceEstimatedMiles')
                : t('tripDetailsPanel.distanceEstimatedKm')}
          </p>
        </div>
      </div>
    </div>
  );
}
