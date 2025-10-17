/**
 * Bike Angel Factory
 * Generates Bike Angel profiles based on trip data
 */

import type { BikeAngelProfile, Trip } from '@/lib/db';
import type { BikeAngelAchievement } from '@/lib/types';
import { BikeAngelConfig } from '@/lib/demo/types';

/**
 * Generate Bike Angel profile from persona config and trips
 */
export function generateBikeAngelProfile(
  userId: string,
  config: BikeAngelConfig,
  trips: Trip[]
): BikeAngelProfile {
  // Calculate rides this month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthTrips = trips.filter((t) => t.startTime >= thisMonthStart);
  const ridesThisMonth = thisMonthTrips.length;

  // Calculate points this month (from trips with angel points)
  const pointsThisMonth = thisMonthTrips.reduce((sum, t) => sum + (t.angelPoints || 0), 0);

  // Map achievement strings to BikeAngelAchievement objects
  const achievements: BikeAngelAchievement[] = config.achievements.map((name) => ({
    id: name,
    name: formatAchievementName(name),
    description: getAchievementDescription(name),
    icon: '🏆', // Default trophy icon
    earnedAt: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
  }));

  return {
    userId,
    totalPoints: config.totalPoints,
    currentLevel: config.currentLevel,
    pointsToNextLevel: config.pointsToNextLevel,
    lifetimePoints: config.totalPoints,
    currentStreak: config.currentStreak,
    longestStreak: config.longestStreak,
    ridesThisMonth,
    pointsThisMonth,
    achievements,
    rawData: {
      // Store full config for reference
      config,
    },
    lastSynced: Date.now(),
  };
}

/**
 * Format achievement name for display
 */
function formatAchievementName(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get achievement description
 */
function getAchievementDescription(id: string): string {
  const descriptions: Record<string, string> = {
    first_50_points: 'Earned your first 50 Bike Angel points',
    week_streak: 'Completed a 7-day Bike Angel streak',
    evening_hero: 'Helped rebalance bikes during evening rush hour',
    morning_warrior: 'Helped rebalance bikes during morning rush hour',
    weekend_champion: 'Earned points on both weekend days',
    hundred_club: 'Reached 100 total Bike Angel points',
    bronze_level: 'Achieved Bronze Bike Angel status',
    silver_level: 'Achieved Silver Bike Angel status',
    gold_level: 'Achieved Gold Bike Angel status',
  };

  return descriptions[id] || 'Bike Angel achievement';
}
