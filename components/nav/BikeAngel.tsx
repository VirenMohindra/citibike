'use client';

import { useEffect, useState } from 'react';
import { Star, TrendingUp, Flame, Award, RefreshCw, Gift } from 'lucide-react';
import { parseBikeAngelResponse, type BikeAngelParsedData } from '@/lib/api/bike-angel-parser';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

interface BikeAngelData {
  totalPoints?: number;
  currentLevel?: string;
  pointsToNextLevel?: number;
  lifetimePoints?: number;
  currentStreak?: number;
  longestStreak?: number;
  ridesThisMonth?: number;
  pointsThisMonth?: number;
}

// Cache for 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

export default function BikeAngel() {
  const { t } = useI18n();
  const { bikeAngelCache, setBikeAngelCache } = useAppStore();
  const [data, setData] = useState<BikeAngelData | null>(null);
  const [parsedData, setParsedData] = useState<BikeAngelParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBikeAngelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBikeAngelData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // Check if we have valid cached data
      const now = Date.now();
      const isCacheValid =
        bikeAngelCache.lastFetched && now - bikeAngelCache.lastFetched < CACHE_DURATION_MS;

      if (!forceRefresh && isCacheValid && bikeAngelCache.data) {
        // Use cached data
        console.log('Using cached Bike Angel data');
        const cached = bikeAngelCache.data;
        setData({
          totalPoints: cached.totalPoints,
          lifetimePoints: cached.lifetimePoints,
          currentLevel: cached.currentLevel,
          pointsToNextLevel: cached.pointsToNextLevel,
          currentStreak: cached.currentStreak,
          longestStreak: cached.longestStreak,
          ridesThisMonth: cached.ridesThisMonth,
          pointsThisMonth: cached.pointsThisMonth,
        });
        // Note: parsedData with rewards is not cached, only basic stats
        setLoading(false);
        return;
      }

      // Fetch fresh data
      console.log('Fetching fresh Bike Angel data');
      const response = await fetch('/api/citibike/bike-angel');

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, silently fail
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch Bike Angel data');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Parse the API response (handles both JSON and protobuf formats)
        const parsed = parseBikeAngelResponse(result.data);
        setParsedData(parsed);

        const bikeAngelData = {
          totalPoints: parsed.totalPoints,
          lifetimePoints: parsed.totalPoints,
          currentLevel: 'Angel',
          pointsToNextLevel: 0,
          currentStreak: 0,
          longestStreak: 0,
          ridesThisMonth: 0,
          pointsThisMonth: 0,
          achievements: [], // Empty achievements array for now
          rawData: result.data, // Store raw API response
        };

        setData(bikeAngelData);

        // Update cache
        setBikeAngelCache({
          data: bikeAngelData,
          lastFetched: Date.now(),
          error: null,
        });
      }
    } catch (err) {
      console.error('Error loading Bike Angel data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Bike Angel data';

      setBikeAngelCache({
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBikeAngelData(true); // Force refresh
    setRefreshing(false);
  };

  // Don't render if loading initially and no data
  if (loading && !data) {
    return null;
  }

  // Don't render if there was an auth error (user not logged in)
  if (!loading && !data && !bikeAngelCache.error) {
    return null;
  }

  // Don't render if there's an error
  if (bikeAngelCache.error && !data) {
    return null;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-6 h-6 text-white" fill="white" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('bikeAngel.title')}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                {data.totalPoints?.toLocaleString() || 0}
              </p>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('bikeAngel.points')}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          title={t('bikeAngel.refreshTitle')}
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Streak */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-600 dark:text-orange-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('bikeAngel.streak')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.currentStreak || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {t('bikeAngel.best')} {data.longestStreak || 0}
            </div>
          </div>

          {/* Lifetime Points */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('bikeAngel.lifetime')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.lifetimePoints?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {t('bikeAngel.allTimePoints')}
            </div>
          </div>

          {/* This Month */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('bikeAngel.thisMonth')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.pointsThisMonth || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.ridesThisMonth || 0} {t('bikeAngel.rides')}
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('bikeAngel.level')}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {data.currentLevel || 'Angel'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.pointsToNextLevel
                ? `${data.pointsToNextLevel} ${t('bikeAngel.toNext')}`
                : t('bikeAngel.maxLevel')}
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        {parsedData && parsedData.rewards.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Gift className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              {t('bikeAngel.availableRewards')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {parsedData.rewards.slice(0, 4).map((reward) => {
                const canAfford = data.totalPoints && data.totalPoints >= reward.pointCost;
                return (
                  <div
                    key={reward.id}
                    className={`rounded-lg p-2 border ${
                      canAfford
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className={`text-lg font-bold ${
                            canAfford
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {reward.pointCost}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t('bikeAngel.points')}
                        </div>
                      </div>
                      {canAfford && (
                        <Star
                          className="w-4 h-4 text-green-600 dark:text-green-500"
                          fill="currentColor"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
          <div className="flex gap-2">
            <Star
              className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
            />
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('bikeAngel.whatIs')}
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {t('bikeAngel.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
