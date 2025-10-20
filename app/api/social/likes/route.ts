// Social Likes/Kudos Endpoint
// Handles kudos and downvotes on trips

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_CONSTANTS } from '@/config/constants';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { tripId, tripOwnerId, type, userId } = body;

    if (!tripId || !tripOwnerId || !type || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId, tripOwnerId, type, userId' },
        { status: 400 }
      );
    }

    if (type !== 'kudos' && type !== 'downvote') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "kudos" or "downvote"' },
        { status: 400 }
      );
    }

    // Return success - actual DB operations happen client-side
    return NextResponse.json({
      success: true,
      like: {
        id: `${userId}-${tripId}`,
        userId,
        tripId,
        tripOwnerId,
        type,
        createdAt: Date.now(),
      },
    });
  } catch (error: unknown) {
    console.error('Like error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred processing like',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const likeId = searchParams.get('id');

    if (!likeId) {
      return NextResponse.json({ error: 'Missing like ID' }, { status: 400 });
    }

    // Return success - actual DB operations happen client-side
    return NextResponse.json({
      success: true,
      message: 'Like removed',
    });
  } catch (error: unknown) {
    console.error('Unlike error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred removing like',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
