import { useState, useEffect } from 'react';
import type { StationReward } from '@/lib/types';

interface BikeAngelRewardsResponse {
  success: boolean;
  data?: {
    rewards: StationReward[];
    totalStations: number;
    location: { lat: number; lon: number };
    radiusKm: number;
  };
  error?: string;
}

interface UseBikeAngelRewardsOptions {
  lat: number;
  lon: number;
  radius?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch Bike Angel station rewards
 * Returns a map of stationId -> reward data for easy lookup
 */
export function useBikeAngelRewards(options: UseBikeAngelRewardsOptions) {
  const { lat, lon, radius = 2.0, enabled = true } = options;
  const [rewards, setRewards] = useState<Map<string, StationReward>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchRewards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/citibike/bike-angel/stations?lat=${lat}&lon=${lon}&radius=${radius}`
        );

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated - silently fail
            setRewards(new Map());
            return;
          }
          throw new Error(`Failed to fetch rewards: ${response.status}`);
        }

        const data: BikeAngelRewardsResponse = await response.json();

        if (data.success && data.data) {
          // Convert array to Map for O(1) lookups
          const rewardsMap = new Map<string, StationReward>();
          data.data.rewards.forEach((reward) => {
            rewardsMap.set(reward.stationId, reward);
          });
          setRewards(rewardsMap);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load rewards';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();

    // Refresh rewards every 60 seconds
    const interval = setInterval(fetchRewards, 60000);

    return () => clearInterval(interval);
  }, [lat, lon, radius, enabled]);

  return { rewards, isLoading, error };
}
