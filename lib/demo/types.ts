/**
 * Demo Mode Types
 *
 * Type definitions for factory system and personas
 */

import type { BikeAngelProfile, Trip, UserProfile } from '@/lib/db';

/**
 * Time window for trip generation
 */
export interface TimeWindow {
  start: string; // HH:mm format (e.g., "08:00")
  end: string; // HH:mm format (e.g., "09:30")
  weight: number; // 0-1, probability of trips in this window
}

/**
 * Route type with weight
 */
export interface RouteType {
  type: 'commute' | 'errand' | 'leisure' | 'angel';
  weight: number; // 0-1, probability of this route type
}

/**
 * Trip pattern configuration for persona
 */
export interface TripPattern {
  daysPerWeek: number; // Average days per week (e.g., 5 for commuter)
  timeWindows: TimeWindow[]; // When trips occur
  routeTypes: RouteType[]; // Types of routes taken
  favoriteStations: string[]; // Station names used frequently
  explorationRate: number; // 0-1, how often to try new routes
  ebikeRate: number; // 0-1, % of trips on e-bike
  distanceRange: [number, number]; // [min, max] in meters
  durationRange: [number, number]; // [min, max] in minutes
}

/**
 * Bike Angel configuration for persona
 */
export interface BikeAngelConfig {
  totalPoints: number;
  currentLevel: string;
  pointsToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  achievements: string[];
}

/**
 * Complete persona definition
 */
export interface Persona {
  id: string; // User ID (e.g., "demo-commuter-001")
  name: string; // User's name (e.g., "Alex Chen")
  displayName: string; // Persona display name for UI (e.g., "Daily Commuter")
  email: string;
  membershipType: string;
  memberSince: string; // ISO date string
  tripPattern: TripPattern;
  bikeAngel: BikeAngelConfig;
  tripCount: number; // Approximate number of trips to generate
}

/**
 * Station data from GBFS
 */
export interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
}

/**
 * Generated demo data package
 */
export interface DemoDataPackage {
  profile: UserProfile;
  trips: Trip[];
  bikeAngel: BikeAngelProfile;
}
