/**
 * City Configuration for Multi-City Bikeshare Support
 * Defines bikeshare system configurations for different cities
 */

export interface CityConfig {
  /** Unique identifier for the city (used in URLs) */
  id: string;

  /** System ID from GBFS feed */
  systemId: string;

  /** Display name for the city */
  name: string;

  /** Bikeshare system name */
  systemName: string;

  /** GBFS base URL (without language/version suffix) */
  gbfsBaseUrl: string;

  /** GBFS version to use */
  gbfsVersion: string;

  /** Default map center coordinates */
  mapCenter: {
    lat: number;
    lon: number;
  };

  /** Default map zoom level */
  defaultZoom: number;

  /** Maximum bounds for map panning [west, south, east, north] */
  maxBounds: [number, number, number, number];

  /** Timezone for the city */
  timezone: string;

  /** System operator */
  operator: string;

  /** Feature flags */
  features: {
    /** Whether Lyft authentication is supported */
    authentication: boolean;
    /** Whether Bike Angel rewards are available */
    bikeAngel: boolean;
    /** Whether the system has e-bikes */
    ebikes: boolean;
  };

  /** Branding configuration */
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };

  /** System website URL */
  websiteUrl: string;

  /** Customer support email */
  supportEmail?: string;
}

/**
 * Available bikeshare cities
 */
export const CITIES: Record<string, CityConfig> = {
  nyc: {
    id: 'nyc',
    systemId: 'lyft_citibike',
    name: 'New York City',
    systemName: 'Citibike',
    gbfsBaseUrl: 'https://gbfs.citibikenyc.com',
    gbfsVersion: 'gbfs/en',
    mapCenter: {
      lat: 40.7407,
      lon: -73.9818,
    },
    defaultZoom: 13,
    maxBounds: [-74.05, 40.68, -73.9, 40.88], // NYC + Jersey City
    timezone: 'America/New_York',
    operator: 'Lyft',
    features: {
      authentication: true,
      bikeAngel: true,
      ebikes: true,
    },
    branding: {
      primaryColor: '#0076BE',
    },
    websiteUrl: 'https://citibikenyc.com',
    supportEmail: 'support@citibikenyc.com',
  },

  dc: {
    id: 'dc',
    systemId: 'lyft_cabi',
    name: 'Washington, DC',
    systemName: 'Capital Bikeshare',
    gbfsBaseUrl: 'https://gbfs.lyft.com/gbfs/2.3/dca-cabi',
    gbfsVersion: 'en',
    mapCenter: {
      lat: 38.904844,
      lon: -77.01797,
    },
    defaultZoom: 13,
    maxBounds: [-77.32, 38.79, -76.91, 39.13], // DC metro area (MD + VA)
    timezone: 'America/New_York',
    operator: 'Lyft',
    features: {
      authentication: true,
      bikeAngel: false, // Not confirmed for DC yet
      ebikes: true,
    },
    branding: {
      primaryColor: '#D32F2F',
    },
    websiteUrl: 'https://capitalbikeshare.com',
    supportEmail: 'customerservice@capitalbikeshare.com',
  },

  sf: {
    id: 'sf',
    systemId: 'lyft_bay_wheels',
    name: 'San Francisco Bay Area',
    systemName: 'Bay Wheels',
    gbfsBaseUrl: 'https://gbfs.baywheels.com',
    gbfsVersion: 'gbfs/en',
    mapCenter: {
      lat: 37.770008,
      lon: -122.428329,
    },
    defaultZoom: 13,
    maxBounds: [-122.55, 37.69, -122.27, 37.87], // SF + Oakland area
    timezone: 'America/Los_Angeles',
    operator: 'Lyft',
    features: {
      authentication: true,
      bikeAngel: false,
      ebikes: true,
    },
    branding: {
      primaryColor: '#00A9E0',
    },
    websiteUrl: 'https://www.lyft.com/bikes/bay-wheels',
  },

  chicago: {
    id: 'chicago',
    systemId: 'lyft_divvy',
    name: 'Chicago',
    systemName: 'Divvy',
    gbfsBaseUrl: 'https://gbfs.divvybikes.com',
    gbfsVersion: 'gbfs/en',
    mapCenter: {
      lat: 41.853319,
      lon: -87.67992,
    },
    defaultZoom: 12,
    maxBounds: [-87.95, 41.64, -87.52, 42.08], // Chicago metro area
    timezone: 'America/Chicago',
    operator: 'Lyft',
    features: {
      authentication: true,
      bikeAngel: false,
      ebikes: true,
    },
    branding: {
      primaryColor: '#0080FF',
    },
    websiteUrl: 'https://divvybikes.com',
  },

  boston: {
    id: 'boston',
    systemId: 'lyft_bluebikes',
    name: 'Boston',
    systemName: 'Blue Bikes',
    gbfsBaseUrl: 'https://gbfs.bluebikes.com',
    gbfsVersion: 'gbfs/en',
    mapCenter: {
      lat: 42.360009,
      lon: -71.086946,
    },
    defaultZoom: 13,
    maxBounds: [-71.19, 42.23, -70.92, 42.52], // Boston metro + Cambridge
    timezone: 'America/New_York',
    operator: 'Lyft',
    features: {
      authentication: true,
      bikeAngel: false,
      ebikes: true,
    },
    branding: {
      primaryColor: '#2E5CA5',
    },
    websiteUrl: 'https://www.bluebikes.com',
  },

  portland: {
    id: 'portland',
    systemId: 'lyft_biketown',
    name: 'Portland, OR',
    systemName: 'Biketown',
    gbfsBaseUrl: 'https://gbfs.biketownpdx.com',
    gbfsVersion: 'gbfs/en',
    mapCenter: {
      lat: 45.530851,
      lon: -122.651401,
    },
    defaultZoom: 13,
    maxBounds: [-122.82, 45.43, -122.52, 45.65], // Portland metro area
    timezone: 'America/Los_Angeles',
    operator: 'Lyft',
    features: {
      authentication: true,
      bikeAngel: false,
      ebikes: true,
    },
    branding: {
      primaryColor: '#FF6B00',
    },
    websiteUrl: 'https://www.biketownpdx.com',
  },
} as const;

/**
 * Default city (NYC for backward compatibility)
 */
export const DEFAULT_CITY_ID = 'nyc';

/**
 * Get city configuration by ID
 */
export function getCityConfig(cityId: string): CityConfig {
  return CITIES[cityId] || CITIES[DEFAULT_CITY_ID];
}

/**
 * Get all available cities
 */
export function getAllCities(): CityConfig[] {
  return Object.values(CITIES);
}

/**
 * Get city ID from URL-friendly slug
 * eg "new-york-city" -> "nyc" which can be used like /nyc for the URLs
 */
export function getCityIdFromSlug(slug: string): string {
  const normalized = slug.toLowerCase().trim();
  return CITIES[normalized] ? normalized : DEFAULT_CITY_ID;
}

/**
 * Check if a city ID is valid
 */
export function isValidCityId(cityId: string): boolean {
  return cityId in CITIES;
}

/**
 * Build GBFS URL for a specific city and endpoint
 */
export function buildCityGbfsUrl(cityId: string, endpoint: string): string {
  const city = getCityConfig(cityId);
  return `${city.gbfsBaseUrl}/${city.gbfsVersion}${endpoint}`;
}
