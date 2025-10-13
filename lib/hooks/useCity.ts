/**
 * useCity hook
 * Provides easy access to current city configuration and switching functionality
 */

import { useAppStore } from '@/lib/store';
import { getCityConfig, type CityConfig } from '@/config/cities';

export function useCity() {
  const currentCityId = useAppStore((state) => state.currentCity);
  const setCurrentCity = useAppStore((state) => state.setCurrentCity);

  const cityConfig: CityConfig = getCityConfig(currentCityId);

  return {
    cityId: currentCityId,
    cityConfig,
    switchCity: setCurrentCity,
    systemName: cityConfig.systemName,
    cityName: cityConfig.name,
    features: cityConfig.features,
  };
}
