// Social Comments Endpoint
// Handles comments on trips

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
    const { tripId, tripOwnerId, userId, userName, userPhoto, text } = body;

    if (!tripId || !tripOwnerId || !userId || !userName || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId, tripOwnerId, userId, userName, text' },
        { status: 400 }
      );
    }

    if (text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Comment text cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Return success - actual DB operations happen client-side
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      comment: {
        id: commentId,
        tripId,
        tripOwnerId,
        userId,
        userName,
        userPhoto,
        text: text.trim(),
        createdAt: Date.now(),
      },
    });
  } catch (error: unknown) {
    console.error('Comment error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred posting comment',
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
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Missing comment ID' }, { status: 400 });
    }

    // Return success - actual DB operations happen client-side
    return NextResponse.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error: unknown) {
    console.error('Delete comment error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred deleting comment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, text } = body;

    if (!commentId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: commentId, text' },
        { status: 400 }
      );
    }

    if (text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Comment text cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Return success - actual DB operations happen client-side
    return NextResponse.json({
      success: true,
      comment: {
        id: commentId,
        text: text.trim(),
        updatedAt: Date.now(),
      },
    });
  } catch (error: unknown) {
    console.error('Update comment error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred updating comment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
