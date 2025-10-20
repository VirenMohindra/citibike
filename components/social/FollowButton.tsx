'use client';

import { useState, useEffect } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '@/lib/social';
import { useAppStore } from '@/lib/store';

interface FollowButtonProps {
  userId: string;
  userName: string;
  compact?: boolean;
}

export default function FollowButton({ userId, userName, compact = false }: FollowButtonProps) {
  const citibikeUser = useAppStore((state) => state.citibikeUser);
  const updateFollowingIds = useAppStore((state) => state.updateFollowingIds);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (!citibikeUser?.id) return;

      const following = await checkIsFollowing(citibikeUser.id, userId);
      setIsFollowingUser(following);
    }

    checkStatus();
  }, [citibikeUser?.id, userId]);

  const handleClick = async () => {
    if (!citibikeUser?.id || isProcessing) return;

    setIsProcessing(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(citibikeUser.id, userId);
        setIsFollowingUser(false);
      } else {
        await followUser(citibikeUser.id, userId);
        setIsFollowingUser(true);
      }

      // Update store with new following list
      const followingModule = await import('@/lib/social');
      const followingIds = await followingModule.getFollowing(citibikeUser.id);
      updateFollowingIds(followingIds);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show follow button for own profile
  if (citibikeUser?.id === userId) {
    return null;
  }

  if (!citibikeUser) {
    return null;
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={`p-2 rounded-full transition-colors ${
          isFollowingUser
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isFollowingUser ? `Unfollow ${userName}` : `Follow ${userName}`}
      >
        {isFollowingUser ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isFollowingUser
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isFollowingUser ? (
        <>
          <UserMinus className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
