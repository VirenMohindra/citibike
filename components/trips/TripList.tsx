'use client';

import { useMemo } from 'react';
import type { Trip } from '@/lib/db/schema';
import { formatDuration } from '@/lib/stats';
import { useI18n } from '@/lib/i18n';

interface TripListProps {
  trips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
}

export default function TripList({ trips, selectedTripId, onSelectTrip }: TripListProps) {
  const { t, formatDistance } = useI18n();
  // Sort trips by start time (most recent first)
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => b.startTime - a.startTime);
  }, [trips]);

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* List Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('tripList.allTrips', { count: trips.length })}
        </h2>
      </div>

      {/* Trip List */}
      <div className="flex-1 overflow-y-auto">
        {sortedTrips.map((trip) => {
          const isSelected = trip.id === selectedTripId;
          const duration = trip.duration;
          const distance = trip.distance;

          return (
            <button
              key={trip.id}
              onClick={() => onSelectTrip(trip.id)}
              className={`w-full px-4 py-3 text-left border-b border-gray-200 dark:border-gray-700 transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {/* Date and Time */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(trip.startTime)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(trip.startTime)}
                </span>
              </div>

              {/* Stations */}
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 space-y-0.5">
                {trip.startStationName && trip.startStationName !== 'Unknown' ? (
                  <>
                    <div className="flex items-start gap-1">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">●</span>
                      <span className="flex-1 truncate">{trip.startStationName}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-red-600 dark:text-red-400 mt-0.5">●</span>
                      <span className="flex-1 truncate">{trip.endStationName}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 italic">
                    {t('tripList.stationDetailsNotAvailable')}
                  </div>
                )}
              </div>

              {/* Trip Stats */}
              <div className="flex items-center gap-3 text-xs">
                {/* Duration */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">⏱️</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatDuration(duration)}
                  </span>
                </div>

                {/* Bike Type */}
                <div className="flex items-center gap-1">
                  <span>{trip.bikeType === 'ebike' ? '⚡' : '🚲'}</span>
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {trip.bikeType}
                  </span>
                </div>

                {/* Distance (if available) */}
                {distance && distance > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">📍</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatDistance(distance)}
                    </span>
                  </div>
                )}
              </div>

              {/* Angel Points (if any) */}
              {trip.angelPoints && trip.angelPoints > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-yellow-700 dark:text-yellow-500 font-medium">
                    +{trip.angelPoints} {t('tripList.pointsLower')}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
