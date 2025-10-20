// Social Activity Feed Endpoint
// Returns activity feed for the authenticated user

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_CONSTANTS } from '@/config/constants';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Return empty feed - actual data fetched from client-side IndexedDB
    // This endpoint validates auth and returns structure
    return NextResponse.json({
      success: true,
      feed: [],
      hasMore: false,
      limit,
      offset,
      message: 'Feed data fetched from client-side database',
    });
  } catch (error: unknown) {
    console.error('Feed error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred fetching activity feed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, actorId, actorName, actorPhoto, actionType, tripId, tripData, text } = body;

    if (!userId || !actorId || !actorName || !actionType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, actorId, actorName, actionType' },
        { status: 400 }
      );
    }

    const validActionTypes = ['trip', 'kudos', 'comment', 'achievement', 'follow'];
    if (!validActionTypes.includes(actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Must be one of: ${validActionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Return success - actual DB operations happen client-side
    const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      activity: {
        id: activityId,
        userId,
        actorId,
        actorName,
        actorPhoto,
        actionType,
        tripId,
        tripData,
        text,
        createdAt: Date.now(),
      },
    });
  } catch (error: unknown) {
    console.error('Create activity error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred creating activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
