/**
 * Demo Mode Loader
 * Handles loading demo users from pregenerated data
 */

import { db, Trip, UserProfile } from '@/lib/db';
import { CitibikeUser } from '@/lib/types';
import { DemoDataPackage } from '@/lib/demo/types';
import { useAppStore } from '@/lib/store';

const demoData = await import('./data/pregenerated-demo.json');

/**
 * Load demo user from pregenerated data
 * Returns the demo user profile or null if loading failed
 */
export async function loadDemoUser(): Promise<CitibikeUser | null> {
  console.log('Loading pregenerated demo data...');
  return await loadPregeneratedDemo();
}

/**
 * Load pregenerated demo data from JSON file
 * Loads user profile and full trip history into IndexedDB
 */
async function loadPregeneratedDemo(): Promise<CitibikeUser | null> {
  console.log('Loading pregenerated demo data...');

  try {
    // Import pregenerated demo data
    const personas = demoData.personas as unknown as DemoDataPackage[];

    if (!personas || personas.length === 0) {
      console.error('No personas found in pregenerated data');
      return await loadMinimalFallback();
    }

    // Use first persona (or random if multiple)
    const persona = personas[0];
    const profile = persona.profile;
    const bikeAngel = persona.bikeAngel;

    // Create user profile
    const userProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber || '+1 (555) 000-0000',
      membershipType: profile.membershipType,
      lastSynced: Date.now(),
    };

    // Store user in IndexedDB
    await db.users.put(userProfile);

    // Store trips in IndexedDB
    console.log(`Loading ${persona.trips.length} pregenerated trips...`);
    const trips: Trip[] = persona.trips.map((trip) => ({
      ...trip,
      userId: profile.id,
    }));

    await db.trips.bulkPut(trips);
    console.log(
      `✅ Loaded pregenerated demo: ${profile.firstName} ${profile.lastName} (${trips.length} trips)`
    );

    // Pre-populate Bike Angel cache with demo data
    useAppStore.getState().setBikeAngelCache({
      data: {
        ...bikeAngel,
        lifetimePoints: bikeAngel.lifetimePoints ?? bikeAngel.totalPoints,
        ridesThisMonth: bikeAngel.ridesThisMonth ?? 0,
        pointsThisMonth: bikeAngel.pointsThisMonth ?? 0,
        achievements: bikeAngel.achievements ?? [],
      },
      lastFetched: Date.now(),
      error: null,
    });
    console.log(
      `✅ Pre-filled Bike Angel data: ${bikeAngel.currentLevel} level, ${bikeAngel.totalPoints} points`
    );

    return {
      ...userProfile,
    };
  } catch (error) {
    console.error('Failed to load pregenerated demo data:', error);
    return await loadMinimalFallback();
  }
}

/**
 * Load minimal fallback (last resort if pregenerated data fails)
 */
async function loadMinimalFallback(): Promise<CitibikeUser | null> {
  console.log('Loading minimal fallback demo (pregenerated data unavailable)');

  const fallbackUser: UserProfile = {
    id: 'demo-fallback-minimal',
    email: 'demo@citibike.example.com',
    firstName: 'Demo',
    lastName: 'User',
    phoneNumber: '+1 (555) 000-0000',
    membershipType: 'annual',
    lastSynced: Date.now(),
  };

  await db.users.put(fallbackUser);

  return {
    ...fallbackUser,
  };
}

/**
 * Complete demo mode setup
 * Loads demo user and trips from pregenerated data into IndexedDB
 *
 * @returns Demo user object or null if setup failed
 */
export async function setupDemoMode(): Promise<CitibikeUser | null> {
  try {
    // Load demo user (trips are loaded automatically by loadPregeneratedDemo)
    const demoUser = await loadDemoUser();
    if (!demoUser) {
      console.error('Failed to load demo user');
      return null;
    }

    console.log('✅ Demo mode setup complete');
    return demoUser;
  } catch (error) {
    console.error('Failed to setup demo mode:', error);
    return null;
  }
}
