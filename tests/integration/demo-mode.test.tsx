/**
 * Integration tests for demo mode auto-load flow
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDemoInitializer } from '@/hooks/useDemoInitializer';
import { useAppStore } from '@/lib/store';
import { setupDemoMode } from '@/lib/demo/loader';

// Mock the demo loader
jest.mock('@/lib/demo/loader', () => ({
  setupDemoMode: jest.fn(),
}));

// Mock IndexedDB
const mockDb = {
  users: {
    put: jest.fn(),
  },
  trips: {
    bulkPut: jest.fn(),
    where: jest.fn(() => ({
      count: jest.fn(() => Promise.resolve(546)),
    })),
  },
};

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

describe('Demo Mode Auto-Load Integration', () => {
  const mockDemoUser = {
    id: 'demo-commuter-001',
    email: 'alex.chen@demo.citibike.app',
    firstName: 'Alex',
    lastName: 'Chen',
    phoneNumber: '+1 (555) 123-4567',
    membershipType: 'annual',
    lastSynced: Date.now(),
  };

  beforeEach(() => {
    // Clear Zustand store
    useAppStore.setState({
      citibikeUser: null,
      isDemoMode: false,
      demoPersona: null,
    });

    // Clear sessionStorage
    sessionStorage.clear();

    // Reset mocks
    jest.clearAllMocks();
    (setupDemoMode as jest.Mock).mockResolvedValue(mockDemoUser);
  });

  describe('useDemoInitializer hook', () => {
    test('auto-loads demo on first visit', async () => {
      const { result } = renderHook(() => {
        useDemoInitializer();
        return useAppStore();
      });

      // Initially no user
      expect(result.current.citibikeUser).toBeNull();
      expect(result.current.isDemoMode).toBe(false);

      // Wait for demo to load
      await waitFor(
        () => {
          expect(setupDemoMode).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(result.current.citibikeUser).toEqual(mockDemoUser);
          expect(result.current.isDemoMode).toBe(true);
          expect(result.current.demoPersona).toBe('daily_commuter');
        },
        { timeout: 3000 }
      );
    });

    test('skips auto-load if user already exists', async () => {
      // Set existing user
      useAppStore.setState({
        citibikeUser: {
          id: 'real-user-123',
          firstName: 'Real',
          lastName: 'User',
          phoneNumber: '+1234567890',
          membershipType: 'annual',
          lastSynced: Date.now(),
        },
      });

      renderHook(() => useDemoInitializer());

      // Wait a bit to ensure no demo load is triggered
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(setupDemoMode).not.toHaveBeenCalled();
    });

    test('skips auto-load if demo mode already active', async () => {
      // Set demo mode already active
      useAppStore.setState({
        isDemoMode: true,
        demoPersona: 'daily_commuter',
      });

      renderHook(() => useDemoInitializer());

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(setupDemoMode).not.toHaveBeenCalled();
    });

    test('skips auto-load if user explicitly logged out', async () => {
      // Set logout flag
      sessionStorage.setItem('citibike-logged-out', 'true');

      renderHook(() => useDemoInitializer());

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(setupDemoMode).not.toHaveBeenCalled();
    });

    test('handles demo load failure gracefully', async () => {
      // Mock failure
      (setupDemoMode as jest.Mock).mockResolvedValueOnce(null);

      const { result } = renderHook(() => {
        useDemoInitializer();
        return useAppStore();
      });

      await waitFor(
        () => {
          expect(setupDemoMode).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );

      // Should not set user or demo mode if load failed
      expect(result.current.citibikeUser).toBeNull();
      expect(result.current.isDemoMode).toBe(false);
    });
  });

  describe('Demo Mode State Management', () => {
    test('enterDemoMode sets correct state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.enterDemoMode('daily_commuter', mockDemoUser);
      });

      expect(result.current.isDemoMode).toBe(true);
      expect(result.current.demoPersona).toBe('daily_commuter');
      expect(result.current.citibikeUser).toEqual(mockDemoUser);
    });

    test('exitDemoMode clears state', () => {
      const { result } = renderHook(() => useAppStore());

      // Enter demo mode first
      act(() => {
        result.current.enterDemoMode('daily_commuter', mockDemoUser);
      });

      expect(result.current.isDemoMode).toBe(true);

      // Exit demo mode
      act(() => {
        result.current.exitDemoMode();
      });

      expect(result.current.isDemoMode).toBe(false);
      expect(result.current.demoPersona).toBeNull();
      expect(result.current.citibikeUser).toBeNull();
    });
  });

  describe('Demo Data Persistence', () => {
    test('loads demo trips into IndexedDB', async () => {
      const { result } = renderHook(() => {
        useDemoInitializer();
        return useAppStore();
      });

      await waitFor(
        () => {
          expect(result.current.isDemoMode).toBe(true);
        },
        { timeout: 3000 }
      );

      // Verify setupDemoMode was called (which handles IndexedDB persistence)
      expect(setupDemoMode).toHaveBeenCalledTimes(1);
    });
  });
});
