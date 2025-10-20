'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, Trophy, Bike } from 'lucide-react';
import { getActivityFeed } from '@/lib/social';
import type { ActivityFeedItem } from '@/lib/db/schema';
import { formatDuration } from '@/lib/stats';
import { useAppStore } from '@/lib/store';

export default function ActivityFeed() {
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const citibikeUser = useAppStore((state) => state.citibikeUser);
  const resetActivityCount = useAppStore((state) => state.resetActivityCount);

  useEffect(() => {
    async function loadFeed() {
      if (!citibikeUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const activities = await getActivityFeed(citibikeUser.id, 50);
        setFeed(activities);
        resetActivityCount();
      } catch (error) {
        console.error('Error loading activity feed:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, [citibikeUser?.id, resetActivityCount]);

  if (!citibikeUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Please log in to see your activity feed</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <Bike className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No activity yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Follow other riders to see their activities here
        </p>
      </div>
    );
  }

  const getActivityIcon = (actionType: ActivityFeedItem['actionType']) => {
    switch (actionType) {
      case 'kudos':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'achievement':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'trip':
        return <Bike className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bike className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: ActivityFeedItem) => {
    const tripData = activity.tripData as {
      distance?: number;
      duration?: number;
      startStationName?: string;
      endStationName?: string;
      bikeType?: string;
    } | undefined;

    switch (activity.actionType) {
      case 'kudos':
        return 'gave you kudos on your ride';
      case 'comment':
        return `commented: "${activity.text}"`;
      case 'follow':
        return 'started following you';
      case 'achievement':
        return `earned ${activity.text}`;
      case 'trip':
        if (tripData) {
          const distance = tripData.distance ? (tripData.distance / 1609.34).toFixed(2) : '0';
          const duration = tripData.duration ? formatDuration(tripData.duration) : '0m';
          return `completed a ${distance} mi ride (${duration})${tripData.bikeType === 'ebike' ? ' on an e-bike' : ''}`;
        }
        return 'completed a ride';
      default:
        return 'did something';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Activity Feed</h2>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {feed.map((activity) => (
          <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-start space-x-3">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                {activity.actorPhoto ? (
                  <img
                    src={activity.actorPhoto}
                    alt={activity.actorName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {activity.actorName.charAt(0)}
                  </div>
                )}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {activity.actorName}
                  </span>
                  <span className="flex-shrink-0">{getActivityIcon(activity.actionType)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {formatTimeAgo(activity.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
