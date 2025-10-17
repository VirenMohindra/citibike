/**
 * Demo Mode Exit Flow
 * Handles cleanup when exiting demo mode and transitioning to real login
 */

import { useAppStore } from '@/lib/store';
import { db } from '@/lib/db';

/**
 * Exit demo mode and clean up all demo data
 * Clears IndexedDB, resets store, and redirects to /login
 */
export async function exitDemoMode(): Promise<void> {
  try {
    console.log('Exiting demo mode...');

    // Get current demo user ID from store
    const store = useAppStore.getState();
    const demoUserId = store.citibikeUser?.id;

    if (!demoUserId) {
      console.warn('No demo user ID found in store');
      return;
    }

    // Clear demo data from IndexedDB
    await clearDemoData(demoUserId);

    // Reset store to initial state
    store.exitDemoMode();

    console.log('Demo mode exited successfully');
  } catch (error) {
    console.error('Error exiting demo mode:', error);
    throw error;
  }
}

/**
 * Clear all demo data from IndexedDB
 */
export async function clearDemoData(userId: string): Promise<void> {
  try {
    console.log(`Clearing demo data for user: ${userId}`);

    // Use existing clearUserData method from db schema
    await db.clearUserData(userId);

    console.log(`Demo data cleared for user: ${userId}`);
  } catch (error) {
    console.error('Failed to clear demo data:', error);
    throw error;
  }
}

/**
 * Handle transition from demo mode to real login
 * Called when user clicks "Log in" from demo mode
 *
 * The modal will open automatically via the loginModalShouldOpen flag
 * set by exitDemoMode() in the store, so no navigation is needed.
 */
export async function transitionToRealLogin(): Promise<void> {
  try {
    // Exit demo mode (clears data and resets store)
    // This will set loginModalShouldOpen: true in the store
    await exitDemoMode();

    // No navigation needed - the CitibikeLogin component will
    // detect the loginModalShouldOpen flag and open the modal
    console.log('Demo exit complete, login modal should open automatically');
  } catch (error) {
    console.error('Error transitioning to real login:', error);
    // Even if cleanup fails, the modal should still try to open
    // via the store flag
  }
}
