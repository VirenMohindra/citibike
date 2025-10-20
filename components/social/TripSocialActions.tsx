'use client';

import { useState, useEffect } from 'react';
import { Heart, ThumbsDown, MessageCircle, Share2, Lock, Unlock } from 'lucide-react';
import { addLike, removeLike, getLikeStatus, toggleTripPrivacy } from '@/lib/social';
import type { Trip } from '@/lib/db/schema';
import { useAppStore } from '@/lib/store';

interface TripSocialActionsProps {
  trip: Trip;
  onCommentClick?: () => void;
  onTripUpdate?: () => void;
}

export default function TripSocialActions({
  trip,
  onCommentClick,
  onTripUpdate,
}: TripSocialActionsProps) {
  const citibikeUser = useAppStore((state) => state.citibikeUser);
  const [userLike, setUserLike] = useState<'kudos' | 'downvote' | null>(null);
  const [kudosCount, setKudosCount] = useState(trip.kudosCount || 0);
  const [downvoteCount, setDownvoteCount] = useState(trip.downvoteCount || 0);
  const [commentCount] = useState(trip.commentCount || 0);
  const [isPublic, setIsPublic] = useState(trip.isPublic !== false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwnTrip = citibikeUser?.id === trip.userId;

  useEffect(() => {
    async function checkLikeStatus() {
      if (!citibikeUser?.id) return;

      const like = await getLikeStatus(citibikeUser.id, trip.id);
      setUserLike(like?.type || null);
    }

    checkLikeStatus();
  }, [citibikeUser?.id, trip.id]);

  const handleKudos = async () => {
    if (!citibikeUser?.id || isProcessing) return;

    setIsProcessing(true);
    try {
      if (userLike === 'kudos') {
        // Remove kudos
        await removeLike(citibikeUser.id, trip.id);
        setUserLike(null);
        setKudosCount((prev) => Math.max(0, prev - 1));
      } else {
        // Add kudos (or switch from downvote)
        if (userLike === 'downvote') {
          await removeLike(citibikeUser.id, trip.id);
          setDownvoteCount((prev) => Math.max(0, prev - 1));
        }
        await addLike(citibikeUser.id, trip.id, trip.userId, 'kudos');
        setUserLike('kudos');
        setKudosCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error handling kudos:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownvote = async () => {
    if (!citibikeUser?.id || isProcessing) return;

    setIsProcessing(true);
    try {
      if (userLike === 'downvote') {
        // Remove downvote
        await removeLike(citibikeUser.id, trip.id);
        setUserLike(null);
        setDownvoteCount((prev) => Math.max(0, prev - 1));
      } else {
        // Add downvote (or switch from kudos)
        if (userLike === 'kudos') {
          await removeLike(citibikeUser.id, trip.id);
          setKudosCount((prev) => Math.max(0, prev - 1));
        }
        await addLike(citibikeUser.id, trip.id, trip.userId, 'downvote');
        setUserLike('downvote');
        setDownvoteCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error handling downvote:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrivacyToggle = async () => {
    if (!isOwnTrip || isProcessing) return;

    setIsProcessing(true);
    try {
      const updatedTrip = await toggleTripPrivacy(trip.id);
      if (updatedTrip) {
        setIsPublic(updatedTrip.isPublic !== false);
        onTripUpdate?.();
      }
    } catch (error) {
      console.error('Error toggling privacy:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Kudos Button */}
        <button
          onClick={handleKudos}
          disabled={isProcessing || !citibikeUser}
          className={`flex items-center space-x-1 transition-colors ${
            userLike === 'kudos'
              ? 'text-red-500'
              : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
          } ${isProcessing || !citibikeUser ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Give kudos"
        >
          <Heart className={`w-5 h-5 ${userLike === 'kudos' ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">{kudosCount}</span>
        </button>

        {/* Downvote Button */}
        <button
          onClick={handleDownvote}
          disabled={isProcessing || !citibikeUser}
          className={`flex items-center space-x-1 transition-colors ${
            userLike === 'downvote'
              ? 'text-orange-500'
              : 'text-gray-600 dark:text-gray-400 hover:text-orange-500'
          } ${isProcessing || !citibikeUser ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Downvote"
        >
          <ThumbsDown className={`w-5 h-5 ${userLike === 'downvote' ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">{downvoteCount}</span>
        </button>

        {/* Comments Button */}
        <button
          onClick={onCommentClick}
          disabled={!citibikeUser}
          className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Comments"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{commentCount}</span>
        </button>

        {/* Share Button */}
        <button
          className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors"
          title="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Privacy Toggle (only for own trips) */}
      {isOwnTrip && (
        <button
          onClick={handlePrivacyToggle}
          disabled={isProcessing}
          className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
            isPublic
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-600 dark:text-gray-400'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
          title={isPublic ? 'Make private' : 'Make public'}
        >
          {isPublic ? (
            <>
              <Unlock className="w-4 h-4" />
              <span className="hidden sm:inline">Public</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Private</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
