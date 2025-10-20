// Social Follows Endpoint
// Handles user follow/unfollow relationships

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
    const { followerId, followingId } = body;

    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: 'Missing required fields: followerId, followingId' },
        { status: 400 }
      );
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Return success - actual DB operations happen client-side
    return NextResponse.json({
      success: true,
      follow: {
        id: `${followerId}-${followingId}`,
        followerId,
        followingId,
        createdAt: Date.now(),
      },
    });
  } catch (error: unknown) {
    console.error('Follow error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred following user',
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
    const followId = searchParams.get('id');

    if (!followId) {
      return NextResponse.json({ error: 'Missing follow ID' }, { status: 400 });
    }

    // Return success - actual DB operations happen client-side
    return NextResponse.json({
      success: true,
      message: 'Unfollowed user',
    });
  } catch (error: unknown) {
    console.error('Unfollow error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred unfollowing user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
