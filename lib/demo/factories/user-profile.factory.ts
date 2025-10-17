/**
 * User Profile Factory
 * Generates demo user profiles
 */

import type { UserProfile } from '@/lib/db';
import { Persona } from '@/lib/demo/types';

/**
 * Generate user profile from persona definition
 */
export function generateUserProfile(persona: Persona): UserProfile {
  return {
    id: persona.id,
    email: persona.email,
    firstName: persona.name.split(' ')[0],
    lastName: persona.name.split(' ')[1] || 'User',
    phoneNumber: '+1 (555) 000-0000', // Fake phone number
    membershipType: persona.membershipType,
    memberSince: persona.memberSince,
    ridesTaken: persona.tripCount,
    region: 'NYC',
    lastSynced: Date.now(),
  };
}
