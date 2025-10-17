'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { History, LogOut, Star, TrendingUp, X } from 'lucide-react';
import BikeAngel from './BikeAngel';
import TripHistory from '../trips/TripHistory';
import TripStats from '../trips/TripStats';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { API_ROUTES } from '@/config/routes';
import { exitDemoMode } from '@/lib/demo/exit';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { citibikeUser, setCitibikeUser, setSyncState, isDemoMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'angel' | 'history'>('stats');

  const handleLogout = async () => {
    try {
      await fetch(API_ROUTES.AUTH.LOGOUT, { method: 'POST' });
      setCitibikeUser(null);
      setSyncState({
        lastSyncTimestamp: null,
        syncStatus: 'idle',
        totalTrips: 0,
      });

      // DEMO MODE: Don't auto-reload demo after logout
      // Set a flag to prevent DemoInitializer from auto-loading
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('citibike-logged-out', 'true');
      }

      onClose();
      // Redirect to root page (user can manually choose demo)
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleExitDemo = async () => {
    try {
      await exitDemoMode();
      onClose();
      // Redirect to homepage (will show login options)
      router.push('/');
    } catch (err) {
      console.error('Exit demo error:', err);
    }
  };

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {citibikeUser?.firstName?.charAt(0) || citibikeUser?.phoneNumber?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {citibikeUser?.firstName && citibikeUser?.lastName
                  ? `${citibikeUser.firstName} ${citibikeUser.lastName}`
                  : citibikeUser?.phoneNumber || t('userProfile.yourProfile')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {citibikeUser?.membershipType || t('userProfile.member')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode ? (
              <button
                onClick={handleExitDemo}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors font-medium"
                title={t('userProfile.exitDemo')}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('userProfile.exitDemo')}</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title={t('userProfile.logout')}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('userProfile.logout')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {t('userProfile.tripStats')}
          </button>
          <button
            onClick={() => setActiveTab('angel')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'angel'
                ? 'border-yellow-600 text-yellow-600 dark:text-yellow-500'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Star className="w-4 h-4" />
            {t('userProfile.bikeAngel')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-green-600 text-green-600 dark:text-green-500'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <History className="w-4 h-4" />
            {t('userProfile.tripHistory')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'stats' && <TripStats />}
          {activeTab === 'angel' && <BikeAngel />}
          {activeTab === 'history' && <TripHistory />}
        </div>
      </div>
    </div>,
    document.body
  );
}
