import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies (stored as separate cookies by otp/verify)
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('citibike_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get request body (optional parameters for pagination/filtering)
    const body = await request.json().catch(() => ({}));

    // Use the Lyft client to fetch trip history
    // The cursor is actually a timestamp (start_time) based on mitmproxy analysis
    const lyftClient = getLyftClient();
    const tripData = await lyftClient.getTripHistory(accessToken, {
      startTime: body.cursor ? parseInt(body.cursor) : body.start_time,
      endTime: body.end_time,
      limit: body.limit,
    });

    return NextResponse.json({
      success: true,
      ...tripData,
    });
  } catch (error: unknown) {
    console.error('Error fetching trip history:', error);

    // Check if it's an authentication error
    const apiError = error as {
      status?: number;
      code?: string;
      message?: string;
    };
    if (apiError.status === 401 || apiError.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication expired', needsReauth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: apiError.message || 'Failed to fetch trip history' },
      { status: apiError.status || 500 }
    );
  }
}

// GET method to fetch trip history (alternative method)
export async function GET(request: NextRequest) {
  return POST(request);
}
