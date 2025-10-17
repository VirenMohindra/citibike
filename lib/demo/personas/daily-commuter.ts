/**
 * Daily Commuter Persona
 * A regular weekday commuter who uses Citibike for work travel
 */

import { subYears } from 'date-fns';
import { Persona } from '@/lib/demo/types';

/**
 * Alex Chen - Daily Commuter
 *
 * Profile:
 * - Uses Citibike primarily for commuting to/from work
 * - Works in Midtown Manhattan, lives in Chelsea
 * - Occasional lunch errands and evening leisure rides
 * - Prefers e-bikes for longer commutes
 * - Moderate Bike Angel participation
 */
export const dailyCommuterPersona: Persona = {
  id: 'demo-commuter-001',
  name: 'Alex Chen',
  displayName: 'Daily Commuter',
  email: 'demo@citibike.example.com',
  membershipType: 'Lyft Pink',
  memberSince: subYears(new Date(), 1).toISOString().split('T')[0], // 1 year ago

  tripPattern: {
    // Works 5 days a week
    daysPerWeek: 5,

    // Time windows for trips
    timeWindows: [
      {
        start: '08:00',
        end: '09:30',
        weight: 0.35, // 35% of trips - morning commute
      },
      {
        start: '17:30',
        end: '19:00',
        weight: 0.35, // 35% of trips - evening commute
      },
      {
        start: '12:00',
        end: '13:30',
        weight: 0.15, // 15% of trips - lunch errands
      },
      {
        start: '19:00',
        end: '22:00',
        weight: 0.15, // 15% of trips - evening leisure
      },
    ],

    // Route types
    routeTypes: [
      { type: 'commute', weight: 0.7 }, // 70% commute
      { type: 'errand', weight: 0.2 }, // 20% errands
      { type: 'leisure', weight: 0.1 }, // 10% leisure
    ],

    // Favorite stations (Chelsea home base → Midtown work)
    favoriteStations: [
      'W 21 St & 6 Ave', // Home area
      'Broadway & W 51 St', // Work (Times Square area)
      '8 Ave & W 31 St', // Penn Station nearby
      'Broadway & W 29 St', // Alternative work station
      'W 17 St & 8 Ave', // Home area alternative
      '9 Ave & W 22 St', // Near home
    ],

    // Occasionally explores new routes (15% of the time)
    explorationRate: 0.15,

    // Uses e-bike 40% of the time (for longer/faster commutes)
    ebikeRate: 0.4,

    // Distance range: 0.5 - 2.2 miles (typical Manhattan commute)
    distanceRange: [800, 3500], // meters

    // Duration range: 8-35 minutes
    durationRange: [8, 35], // minutes
  },

  // Bike Angel profile
  bikeAngel: {
    totalPoints: 1250,
    currentLevel: 'Silver',
    pointsToNextLevel: 250,
    currentStreak: 3,
    longestStreak: 7,
    achievements: [
      'first_50_points',
      'week_streak',
      'evening_hero',
      'hundred_club',
      'bronze_level',
      'silver_level',
    ],
  },

  // Expected trip count over 1 year
  tripCount: 220, // ~5 days/week × 2 trips/day × 52 weeks × 0.85 (accounting for vacations)
};
