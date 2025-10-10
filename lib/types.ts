// GBFS (General Bikeshare Feed Specification) Type Definitions
// Based on Citibike NYC GBFS v2.3 API

export interface GBFSResponse<T> {
  last_updated: number;
  ttl: number;
  version: string;
  data: T;
}

// Station Information
export interface Station {
  station_id: string;
  name: string;
  short_name: string;
  lat: number;
  lon: number;
  region_id: string;
  rental_methods: ('KEY' | 'CREDITCARD')[];
  capacity: number;
  electric_bike_surcharge_waiver: boolean;
  eightd_has_key_dispenser: boolean;
  has_kiosk: boolean;
  external_id: string;
  eightd_station_services: string[];
  station_type: 'classic' | string;
  rental_uris: {
    android: string;
    ios: string;
  };
  legacy_id?: string;
}

export interface StationInformation {
  stations: Station[];
}

// Station Status (real-time availability)
export interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_bikes_disabled: number;
  num_docks_available: number;
  num_docks_disabled: number;
  is_installed: 0 | 1;
  is_renting: 0 | 1;
  is_returning: 0 | 1;
  last_reported: number;
  eightd_has_available_keys: boolean;
  num_scooters_available?: number;
  num_scooters_unavailable?: number;
  legacy_id?: string;
}

export interface StationStatusData {
  stations: StationStatus[];
}

// Combined station data (information + status)
export interface StationWithStatus extends Station {
  status?: StationStatus;
  num_bikes_available?: number;
  num_ebikes_available?: number;
  num_docks_available?: number;
  is_renting?: boolean;
  is_installed?: boolean;
}

// System Information
export interface SystemInformation {
  system_id: string;
  language: string;
  name: string;
  short_name?: string;
  operator: string;
  url: string;
  purchase_url: string;
  start_date: string;
  phone_number?: string;
  email?: string;
  timezone: string;
  license_url?: string;
}

// System Regions
export interface Region {
  region_id: string;
  name: string;
}

export interface SystemRegions {
  regions: Region[];
}

// Pricing Plans
export interface PricingPlan {
  plan_id: string;
  url?: string;
  name: string;
  currency: string;
  price: string;
  is_taxable: boolean;
  description: string;
  per_km_pricing?: Array<{
    start: number;
    rate: number;
    interval: number;
    end?: number;
  }>;
}

export interface SystemPricingPlans {
  plans: PricingPlan[];
}

// Vehicle Types
export interface VehicleType {
  vehicle_type_id: string;
  form_factor: 'bicycle' | 'scooter' | 'car' | 'moped' | 'other';
  propulsion_type: 'human' | 'electric_assist' | 'electric' | 'combustion';
  max_range_meters?: number;
  name: string;
  vehicle_accessories?: string[];
  g_CO2_km?: number;
  vehicle_image?: string;
  make?: string;
  model?: string;
  color?: string;
  wheel_count?: number;
  max_permitted_speed?: number;
  rated_power?: number;
  default_reserve_time?: number;
  return_constraint?: 'free_floating' | 'roundtrip_station' | 'any_station' | 'hybrid';
  vehicle_assets?: {
    icon_url?: string;
    icon_url_dark?: string;
    icon_last_modified?: string;
  };
  default_pricing_plan_id?: string;
  pricing_plan_ids?: string[];
}

export interface VehicleTypes {
  vehicle_types: VehicleType[];
}

// UI State Types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver?: {
    type: string;
    modifier?: string;
    bearing_after?: number;
    location?: [number, number];
  };
}

export interface SavedRoute {
  id: string;
  name: string;
  startStationId: string;
  endStationId: string;
  waypointIds: string[];
  distance: number;
  duration: number;
  routeProfile: 'fastest' | 'safest' | 'scenic' | 'insane';
  createdAt: number;
  lastUsed?: number;
}

// Personal Data Integration Types
export interface CitibikeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  membershipType: string;
  memberSince?: string;
  ridesTaken?: number;
  region?: string;
  userPhoto?: string;
  referralCode?: string;
}

export interface CitibikeAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: CitibikeUser;
}

// OTP Authentication Types
export interface OTPRequestBody {
  phoneNumber: string;
  deviceId?: string;
}

export interface OTPVerifyBody {
  phoneNumber?: string; // Optional, phone is stored in cookie from request step
  code: string;
  sessionId?: string; // Optional session ID
  deviceId?: string;
}

export interface OTPRequestResponse {
  success: boolean;
  message: string;
  sessionId?: string; // Some APIs return a session ID to track the OTP request
  expiresIn?: number; // How long the OTP is valid (seconds)
}

export interface Trip {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  startStationId: string;
  startStationName: string;
  startLat: number;
  startLon: number;
  endStationId: string;
  endStationName: string;
  endLat: number;
  endLon: number;
  bikeType: 'classic' | 'ebike';
  distance?: number; // meters, calculated from coordinates or estimated from duration
  polyline?: string; // Encoded polyline from trip details API (Google polyline format)
  hasActualCoordinates?: boolean; // True if coordinates are from trip details API, false if estimated
}

// Response type for individual trip details API
export interface TripDetailsResponse {
  trip: Record<string, unknown>;
}

export interface TripStats {
  totalTrips: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  co2Saved: number; // grams
  moneySaved: number; // dollars (vs car/taxi)
  favoriteStartStations: Array<{
    stationId: string;
    stationName: string;
    count: number;
  }>;
  favoriteEndStations: Array<{
    stationId: string;
    stationName: string;
    count: number;
  }>;
  ridingPatterns: {
    byMonth: Record<string, number>;
    byDayOfWeek: Record<string, number>;
    byHour: Record<string, number>;
  };
  bikeTypeUsage: {
    classic: number;
    ebike: number;
  };
}

export interface SyncState {
  lastSyncTimestamp: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  totalTrips: number;
  errorMessage?: string;
}

// Bike Angel Types
export interface BikeAngelProfile {
  totalPoints: number;
  currentLevel: string;
  pointsToNextLevel: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  ridesThisMonth: number;
  pointsThisMonth: number;
  achievements: BikeAngelAchievement[];
}

export interface BikeAngelAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface BikeAngelReward {
  stationId: string;
  points: number;
  type: 'pickup' | 'dropoff';
  expiresAt?: Date;
}

export interface BikeAngelCache {
  data: BikeAngelProfile | null;
  lastFetched: number | null;
  error: string | null;
}

export interface AppState {
  startStation: StationWithStatus | null;
  endStation: StationWithStatus | null;
  waypoints: StationWithStatus[];
  route: RouteInfo | null;
  hoveredStation: string | null;
  selectedStation: string | null;
  mapBounds: MapBounds | null;
  favoriteStations: string[];
  savedRoutes: SavedRoute[];
  citibikeUser: CitibikeUser | null;
  syncState: SyncState;
  bikeAngelCache: BikeAngelCache;
  distanceUnit: 'miles' | 'km';
  setStartStation: (station: StationWithStatus | null) => void;
  setEndStation: (station: StationWithStatus | null) => void;
  addWaypoint: (station: StationWithStatus) => void;
  removeWaypoint: (index: number) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;
  clearWaypoints: () => void;
  setRoute: (route: RouteInfo | null) => void;
  setHoveredStation: (stationId: string | null) => void;
  setSelectedStation: (stationId: string | null) => void;
  setMapBounds: (bounds: MapBounds | null) => void;
  clearRoute: () => void;
  toggleFavorite: (stationId: string) => void;
  isFavorite: (stationId: string) => boolean;
  saveRoute: (name: string, routeProfile: 'fastest' | 'safest' | 'scenic' | 'insane') => void;
  loadRoute: (routeId: string, stations: StationWithStatus[]) => void;
  deleteRoute: (routeId: string) => void;
  setCitibikeUser: (user: CitibikeUser | null) => void;
  setSyncState: (state: Partial<SyncState>) => void;
  setBikeAngelCache: (cache: Partial<BikeAngelCache>) => void;
  setDistanceUnit: (unit: 'miles' | 'km') => void;
}
