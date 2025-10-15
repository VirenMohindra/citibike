'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

export type RouteProfile = 'fastest' | 'safest' | 'scenic' | 'insane';

interface RouteProfileSelectorProps {
  onProfileChange: (profile: RouteProfile) => void;
}

export function RouteProfileSelector({ onProfileChange }: RouteProfileSelectorProps) {
  const { t } = useI18n();
  const [selectedProfile, setSelectedProfile] = useState<RouteProfile>('fastest');
  const { startStation, endStation } = useAppStore();

  const profiles = [
    {
      id: 'fastest' as RouteProfile,
      name: t('routeProfile.fastest.name'),
      description: t('routeProfile.fastest.description'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      selectedBorder: 'border-blue-600',
    },
    {
      id: 'safest' as RouteProfile,
      name: t('routeProfile.safest.name'),
      description: t('routeProfile.safest.description'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      selectedBorder: 'border-green-600',
    },
    {
      id: 'scenic' as RouteProfile,
      name: t('routeProfile.scenic.name'),
      description: t('routeProfile.scenic.description'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      selectedBorder: 'border-purple-600',
    },
    {
      id: 'insane' as RouteProfile,
      name: t('routeProfile.insane.name'),
      description: t('routeProfile.insane.description'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      selectedBorder: 'border-red-600',
    },
  ];

  const handleProfileSelect = (profile: RouteProfile) => {
    setSelectedProfile(profile);
    onProfileChange(profile);
  };

  // Show the selector even when stations aren't selected, but disable it
  const isDisabled = !startStation || !endStation;

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t('routeProfile.title')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => !isDisabled && handleProfileSelect(profile.id)}
            disabled={isDisabled}
            className={`
              relative p-3 rounded-lg border-2 transition-all
              ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              ${
                selectedProfile === profile.id
                  ? `${profile.bgColor} dark:${profile.bgColor.replace('50', '900/30')} ${profile.selectedBorder} ${profile.color}`
                  : `bg-white dark:bg-gray-800 ${profile.borderColor} dark:${profile.borderColor.replace('200', '700')} ${!isDisabled ? `hover:${profile.bgColor}` : ''} text-gray-800 dark:text-gray-200 ${!isDisabled ? `hover:${profile.color}` : ''}`
              }
            `}
            title={profile.description}
          >
            <div className="flex flex-col items-center space-y-1">
              <div className={`${selectedProfile === profile.id ? profile.color : ''}`}>
                {profile.icon}
              </div>
              <span className="text-xs font-medium">{profile.name}</span>
            </div>
            {selectedProfile === profile.id && (
              <div className="absolute top-1 right-1">
                <div
                  className={`w-2 h-2 rounded-full ${profile.bgColor.replace('50', '600').replace('bg-', 'bg-')}`}
                />
              </div>
            )}
          </button>
        ))}
      </div>
      <p
        className={`mt-2 text-xs text-center ${isDisabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {isDisabled
          ? t('routeProfile.selectStations')
          : profiles.find((p) => p.id === selectedProfile)?.description}
      </p>
    </div>
  );
}
