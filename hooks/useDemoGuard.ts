/**
 * DEMO MODE: Hook for guarding features that require real authentication
 * Shows FeatureLockedModal when demo user tries to access restricted features
 */

import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

interface UseDemoGuardReturn {
  isFeatureLocked: boolean;
  showLockedModal: boolean;
  featureName: string;
  checkFeatureAccess: (featureName: string) => boolean;
  setShowLockedModal: (show: boolean) => void;
}

/**
 * Hook to guard features that require real authentication
 *
 * @example
 * const { checkFeatureAccess, showLockedModal, setShowLockedModal, featureName } = useDemoGuard();
 *
 * const handleSyncTrips = () => {
 *   if (!checkFeatureAccess('Sync Trips')) return;
 *   // Proceed with sync...
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleSyncTrips}>Sync</button>
 *     <FeatureLockedModal
 *       isOpen={showLockedModal}
 *       onClose={() => setShowLockedModal(false)}
 *       featureName={featureName}
 *     />
 *   </>
 * );
 */
export function useDemoGuard(): UseDemoGuardReturn {
  const { isDemoMode } = useAppStore();
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [featureName, setFeatureName] = useState('');

  /**
   * Check if user can access a feature
   * If demo mode, shows locked modal and returns false
   * Otherwise returns true
   */
  const checkFeatureAccess = useCallback(
    (feature: string): boolean => {
      if (isDemoMode) {
        setFeatureName(feature);
        setShowLockedModal(true);
        return false;
      }
      return true;
    },
    [isDemoMode]
  );

  return {
    isFeatureLocked: isDemoMode,
    showLockedModal,
    featureName,
    checkFeatureAccess,
    setShowLockedModal,
  };
}
