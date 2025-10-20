// Social Features Utility Library
// Client-side database operations for social features

import { db } from './db/schema';
import type { Follow, Like, Comment, ActivityFeedItem, Trip } from './db/schema';

// ============================================
// Likes/Kudos Functions
// ============================================

/**
 * Add a kudos or downvote to a trip
 */
export async function addLike(
  userId: string,
  tripId: string,
  tripOwnerId: string,
  type: 'kudos' | 'downvote'
): Promise<Like> {
  const likeId = `${userId}-${tripId}`;

  const like: Like = {
    id: likeId,
    userId,
    tripId,
    tripOwnerId,
    type,
    createdAt: Date.now(),
  };

  await db.likes.put(like);

  // Update trip kudos/downvote count
  const trip = await db.trips.get(tripId);
  if (trip) {
    if (type === 'kudos') {
      trip.kudosCount = (trip.kudosCount || 0) + 1;
    } else {
      trip.downvoteCount = (trip.downvoteCount || 0) + 1;
    }
    await db.trips.put(trip);
  }

  // Create activity feed item for kudos (not for downvotes to avoid negativity)
  if (type === 'kudos' && userId !== tripOwnerId) {
    const user = await db.users.get(userId);
    await createActivityFeedItem({
      userId: tripOwnerId,
      actorId: userId,
      actorName: user ? `${user.firstName} ${user.lastName}` : 'Anonymous',
      actorPhoto: user?.userPhoto,
      actionType: 'kudos',
      tripId,
    });
  }

  return like;
}

/**
 * Remove a like from a trip
 */
export async function removeLike(userId: string, tripId: string): Promise<void> {
  const likeId = `${userId}-${tripId}`;
  const like = await db.likes.get(likeId);

  if (like) {
    await db.likes.delete(likeId);

    // Update trip kudos/downvote count
    const trip = await db.trips.get(tripId);
    if (trip) {
      if (like.type === 'kudos') {
        trip.kudosCount = Math.max((trip.kudosCount || 0) - 1, 0);
      } else {
        trip.downvoteCount = Math.max((trip.downvoteCount || 0) - 1, 0);
      }
      await db.trips.put(trip);
    }
  }
}

/**
 * Get like status for a trip by a user
 */
export async function getLikeStatus(userId: string, tripId: string): Promise<Like | null> {
  const likeId = `${userId}-${tripId}`;
  return (await db.likes.get(likeId)) || null;
}

/**
 * Get all likes for a trip
 */
export async function getTripLikes(tripId: string): Promise<Like[]> {
  return await db.likes.where({ tripId }).toArray();
}

/**
 * Get kudos count for a trip
 */
export async function getTripKudosCount(tripId: string): Promise<number> {
  return await db.likes.where({ tripId, type: 'kudos' }).count();
}

// ============================================
// Comments Functions
// ============================================

/**
 * Add a comment to a trip
 */
export async function addComment(
  tripId: string,
  tripOwnerId: string,
  userId: string,
  userName: string,
  userPhoto: string | undefined,
  text: string
): Promise<Comment> {
  const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const comment: Comment = {
    id: commentId,
    tripId,
    tripOwnerId,
    userId,
    userName,
    userPhoto,
    text: text.trim(),
    createdAt: Date.now(),
  };

  await db.comments.put(comment);

  // Update trip comment count
  const trip = await db.trips.get(tripId);
  if (trip) {
    trip.commentCount = (trip.commentCount || 0) + 1;
    await db.trips.put(trip);
  }

  // Create activity feed item for comment
  if (userId !== tripOwnerId) {
    await createActivityFeedItem({
      userId: tripOwnerId,
      actorId: userId,
      actorName: userName,
      actorPhoto: userPhoto,
      actionType: 'comment',
      tripId,
      text: text.substring(0, 100), // Truncate for feed
    });
  }

  return comment;
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, text: string): Promise<void> {
  const comment = await db.comments.get(commentId);

  if (comment) {
    comment.text = text.trim();
    comment.updatedAt = Date.now();
    await db.comments.put(comment);
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const comment = await db.comments.get(commentId);

  if (comment) {
    await db.comments.delete(commentId);

    // Update trip comment count
    const trip = await db.trips.get(comment.tripId);
    if (trip) {
      trip.commentCount = Math.max((trip.commentCount || 0) - 1, 0);
      await db.trips.put(trip);
    }
  }
}

/**
 * Get all comments for a trip
 */
export async function getTripComments(tripId: string): Promise<Comment[]> {
  return await db.comments.where({ tripId }).sortBy('createdAt');
}

// ============================================
// Follow Functions
// ============================================

/**
 * Follow a user
 */
export async function followUser(followerId: string, followingId: string): Promise<Follow> {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  const followId = `${followerId}-${followingId}`;

  const follow: Follow = {
    id: followId,
    followerId,
    followingId,
    createdAt: Date.now(),
  };

  await db.follows.put(follow);

  // Update follower/following counts
  const follower = await db.users.get(followerId);
  const following = await db.users.get(followingId);

  if (follower) {
    follower.followingCount = (follower.followingCount || 0) + 1;
    await db.users.put(follower);
  }

  if (following) {
    following.followerCount = (following.followerCount || 0) + 1;
    await db.users.put(following);
  }

  // Create activity feed item
  if (follower) {
    await createActivityFeedItem({
      userId: followingId,
      actorId: followerId,
      actorName: `${follower.firstName} ${follower.lastName}`,
      actorPhoto: follower.userPhoto,
      actionType: 'follow',
    });
  }

  return follow;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const followId = `${followerId}-${followingId}`;
  const follow = await db.follows.get(followId);

  if (follow) {
    await db.follows.delete(followId);

    // Update follower/following counts
    const follower = await db.users.get(followerId);
    const following = await db.users.get(followingId);

    if (follower) {
      follower.followingCount = Math.max((follower.followingCount || 0) - 1, 0);
      await db.users.put(follower);
    }

    if (following) {
      following.followerCount = Math.max((following.followerCount || 0) - 1, 0);
      await db.users.put(following);
    }
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const followId = `${followerId}-${followingId}`;
  const follow = await db.follows.get(followId);
  return !!follow;
}

/**
 * Get all users that a user is following
 */
export async function getFollowing(userId: string): Promise<string[]> {
  const follows = await db.follows.where({ followerId: userId }).toArray();
  return follows.map((f) => f.followingId);
}

/**
 * Get all followers of a user
 */
export async function getFollowers(userId: string): Promise<string[]> {
  const follows = await db.follows.where({ followingId: userId }).toArray();
  return follows.map((f) => f.followerId);
}

// ============================================
// Activity Feed Functions
// ============================================

/**
 * Create an activity feed item
 */
export async function createActivityFeedItem(activity: {
  userId: string;
  actorId: string;
  actorName: string;
  actorPhoto?: string;
  actionType: 'trip' | 'kudos' | 'comment' | 'achievement' | 'follow';
  tripId?: string;
  tripData?: Record<string, unknown>;
  text?: string;
}): Promise<ActivityFeedItem> {
  const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const feedItem: ActivityFeedItem = {
    id: activityId,
    ...activity,
    createdAt: Date.now(),
  };

  await db.activityFeed.put(feedItem);
  return feedItem;
}

/**
 * Get activity feed for a user (from users they follow)
 */
export async function getActivityFeed(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityFeedItem[]> {
  // Get users that current user follows
  const following = await getFollowing(userId);

  // Get activities from followed users
  const activities = await db.activityFeed
    .where('actorId')
    .anyOf([...following, userId]) // Include own activities
    .reverse()
    .sortBy('createdAt');

  return activities.slice(offset, offset + limit);
}

/**
 * Get recent activities for a specific user
 */
export async function getUserActivities(userId: string, limit: number = 20): Promise<ActivityFeedItem[]> {
  return await db.activityFeed
    .where({ actorId: userId })
    .reverse()
    .limit(limit)
    .sortBy('createdAt');
}

// ============================================
// Trip Sharing Functions
// ============================================

/**
 * Toggle trip privacy (public/private)
 */
export async function toggleTripPrivacy(tripId: string): Promise<Trip | null> {
  const trip = await db.trips.get(tripId);

  if (trip) {
    trip.isPublic = !trip.isPublic;
    await db.trips.put(trip);

    // If making public, share to activity feed
    if (trip.isPublic && !trip.sharedAt) {
      trip.sharedAt = Date.now();
      await db.trips.put(trip);

      const user = await db.users.get(trip.userId);
      if (user) {
        await createActivityFeedItem({
          userId: trip.userId,
          actorId: trip.userId,
          actorName: `${user.firstName} ${user.lastName}`,
          actorPhoto: user.userPhoto,
          actionType: 'trip',
          tripId: trip.id,
          tripData: {
            distance: trip.distance,
            duration: trip.duration,
            startStationName: trip.startStationName,
            endStationName: trip.endStationName,
            bikeType: trip.bikeType,
          },
        });
      }
    }
  }

  return trip || null;
}

/**
 * Share a trip to activity feed
 */
export async function shareTripToFeed(tripId: string): Promise<void> {
  const trip = await db.trips.get(tripId);

  if (trip && trip.isPublic !== false) {
    trip.isPublic = true;
    trip.sharedAt = Date.now();
    await db.trips.put(trip);

    const user = await db.users.get(trip.userId);
    if (user) {
      await createActivityFeedItem({
        userId: trip.userId,
        actorId: trip.userId,
        actorName: `${user.firstName} ${user.lastName}`,
        actorPhoto: user.userPhoto,
        actionType: 'trip',
        tripId: trip.id,
        tripData: {
          distance: trip.distance,
          duration: trip.duration,
          startStationName: trip.startStationName,
          endStationName: trip.endStationName,
          bikeType: trip.bikeType,
        },
      });
    }
  }
}

/**
 * Get public trips from followed users
 */
export async function getFollowingPublicTrips(userId: string, limit: number = 50): Promise<Trip[]> {
  const following = await getFollowing(userId);

  const trips = await db.trips
    .where('userId')
    .anyOf(following)
    .and((trip) => trip.isPublic === true)
    .reverse()
    .limit(limit)
    .sortBy('startTime');

  return trips;
}
