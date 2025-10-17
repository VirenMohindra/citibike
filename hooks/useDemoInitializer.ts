import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { setupDemoMode } from '@/lib/demo/loader';

/**
 * DEMO MODE: Auto-loads demo account on first visit
 * Runs once on app initialization if no user is logged in
 */
export function useDemoInitializer() {
  const { citibikeUser, isDemoMode, enterDemoMode, setCitibikeUser } = useAppStore();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only run once
    if (hasInitialized) return;

    // Skip if user already exists (real login or demo already loaded)
    if (citibikeUser) {
      setHasInitialized(true);
      return;
    }

    // Skip if demo mode already active
    if (isDemoMode) {
      setHasInitialized(true);
      return;
    }

    // DEMO MODE: Skip if user explicitly logged out
    if (typeof window !== 'undefined' && sessionStorage.getItem('citibike-logged-out')) {
      console.log('⏭️ Skipping auto-demo (user logged out)');
      setHasInitialized(true);
      return;
    }

    // Auto-load demo on first visit
    const initializeDemo = async () => {
      try {
        console.log('🎬 First visit detected - loading demo account...');
        const demoUser = await setupDemoMode();

        if (demoUser) {
          // Set user and enter demo mode
          setCitibikeUser(demoUser);
          enterDemoMode('daily_commuter', demoUser);
          console.log('✅ Demo account loaded successfully');
        } else {
          console.warn('⚠️ Failed to load demo account');
        }
      } catch (error) {
        console.error('❌ Error initializing demo mode:', error);
      } finally {
        setHasInitialized(true);
      }
    };

    // Run initialization
    initializeDemo();
  }, [citibikeUser, isDemoMode, hasInitialized, enterDemoMode, setCitibikeUser]);
}
