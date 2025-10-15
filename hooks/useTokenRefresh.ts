/**
 * Token Refresh Hook
 * Automatically refreshes Citibike access token before expiry
 */
import { useCallback, useEffect, useRef } from 'react';

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export interface TokenRefreshStatus {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: string | null;
}

export function useTokenRefresh() {
  const refreshingRef = useRef(false);
  const lastRefreshRef = useRef<Date | null>(null);
  const errorRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getCookie = useCallback((name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }, []);

  const refreshToken = useCallback(async () => {
    // Prevent concurrent refresh attempts
    if (refreshingRef.current) {
      console.log('⏳ Token refresh already in progress, skipping...');
      return;
    }

    try {
      refreshingRef.current = true;
      errorRef.current = null;

      console.log('🔄 Refreshing access token...');

      const response = await fetch('/api/citibike/refresh', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token refresh failed');
      }

      lastRefreshRef.current = new Date();
      console.log('✅ Token refreshed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorRef.current = errorMessage;
      console.error('❌ Token refresh failed:', errorMessage);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const checkAndRefresh = useCallback(async () => {
    // Check if token will expire soon
    const expiresAtStr = getCookie('citibike_token_expires_at');

    if (!expiresAtStr) {
      console.log('⚠️  No expiry cookie found, skipping refresh check');
      return;
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= REFRESH_BEFORE_EXPIRY_MS) {
      console.log(
        `⏰ Token expires in ${Math.floor(timeUntilExpiry / 1000 / 60)} minutes, refreshing now...`
      );
      await refreshToken();
    }
  }, [getCookie, refreshToken]);

  // Set up periodic check
  useEffect(() => {
    // Initial check
    checkAndRefresh();

    // Set up interval for periodic checks
    intervalRef.current = setInterval(checkAndRefresh, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAndRefresh]);

  return {
    isRefreshing: refreshingRef.current,
    lastRefresh: lastRefreshRef.current,
    error: errorRef.current,
    manualRefresh: refreshToken,
  };
}
