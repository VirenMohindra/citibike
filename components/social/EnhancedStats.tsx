'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Clock, DollarSign, Zap } from 'lucide-react';
import { db } from '@/lib/db/schema';
import { calculateEnhancedStats, formatDuration, type EnhancedTripStats } from '@/lib/stats';
import type { Trip } from '@/lib/types';
import { useAppStore } from '@/lib/store';

export default function EnhancedStats() {
  const citibikeUser = useAppStore((state) => state.citibikeUser);
  const [stats, setStats] = useState<EnhancedTripStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!citibikeUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const trips = await db.trips.where({ userId: citibikeUser.id }).toArray();

        // Convert database trips to match Trip type from types.ts
        const convertedTrips: Trip[] = trips.map((trip) => ({
          ...trip,
          startTime: new Date(trip.startTime),
          endTime: new Date(trip.endTime),
        }));

        const enhancedStats = calculateEnhancedStats(convertedTrips);
        setStats(enhancedStats);
      } catch (error) {
        console.error('Error loading enhanced stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [citibikeUser?.id]);

  if (!citibikeUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Please log in to see your stats</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalTrips === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No trips yet. Start riding to see stats!</p>
      </div>
    );
  }

  const achievements = [
    {
      icon: TrendingUp,
      label: 'Longest Distance',
      value: stats.formatted.longestDistance,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: Clock,
      label: 'Longest Ride',
      value: stats.formatted.longestDuration,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: Zap,
      label: 'Average Pace',
      value: stats.formatted.averagePace,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: DollarSign,
      label: 'Most Expensive',
      value: stats.formatted.mostExpensiveCost,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Personal Records</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 ${achievement.bgColor} rounded-lg flex items-center justify-center mb-3`}
              >
                <achievement.icon className={`w-6 h-6 ${achievement.color}`} />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {achievement.label}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {achievement.value}
              </p>
            </div>
          ))}
        </div>

        {/* Detailed Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Trips</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.totalTrips}
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Distance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {(stats.totalDistance / 1609.34).toFixed(1)} mi
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {formatDuration(stats.totalDuration)}
            </p>
          </div>
        </div>

        {/* Longest Trip Details */}
        {stats.longestDistanceTrip && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Longest Distance Trip
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {stats.longestDistanceTrip.startStationName} →{' '}
              {stats.longestDistanceTrip.endStationName}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {formatDuration(stats.longestDistanceTrip.duration)} •{' '}
              {new Date(stats.longestDistanceTrip.startTime).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
