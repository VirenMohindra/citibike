'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import NavBar from '@/components/nav/NavBar';
import ActivityFeed from '@/components/social/ActivityFeed';
import EnhancedStats from '@/components/social/EnhancedStats';
import { useAppStore } from '@/lib/store';
import CitibikeLogin from '@/components/nav/CitibikeLogin';

function FeedContent() {
  const citibikeUser = useAppStore((state) => state.citibikeUser);

  if (!citibikeUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Welcome to the Activity Feed
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            Log in to see your friends&apos; activities and share your rides
          </p>
          <CitibikeLogin compact={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Activity Feed
            </h1>
            <p className="text-gray-600 dark:text-gray-400">See what your friends are riding</p>
          </div>

          <Suspense
            fallback={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            }
          >
            <ActivityFeed />
          </Suspense>
        </div>

        {/* Sidebar - 1/3 width on large screens */}
        <div className="space-y-6">
          <Suspense
            fallback={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            }
          >
            <EnhancedStats />
          </Suspense>

          {/* Profile Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center space-x-4 mb-4">
              {citibikeUser.userPhoto ? (
                <Image
                  src={citibikeUser.userPhoto}
                  alt={`${citibikeUser.firstName} ${citibikeUser.lastName}`}
                  className="w-16 h-16 rounded-full object-cover"
                  width={64}
                  height={64}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {citibikeUser.firstName.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {citibikeUser.firstName} {citibikeUser.lastName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {citibikeUser.membershipType}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {useAppStore.getState().socialState.followingCount}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Following</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {useAppStore.getState().socialState.followerCount}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Followers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <FeedContent />
    </div>
  );
}
