'use client';

import { useCity } from '@/lib/hooks/useCity';
import { getAllCities } from '@/config/cities';

export function CitySelector() {
  const { cityId, switchCity } = useCity();
  const cities = getAllCities();

  return (
    <div className="relative">
      <select
        value={cityId}
        onChange={(e) => switchCity(e.target.value)}
        className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
        aria-label="Select city"
      >
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
