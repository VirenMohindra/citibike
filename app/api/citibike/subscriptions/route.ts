// Citibike Subscriptions Endpoint
// Fetches membership/subscription data from Lyft API

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getLyftClient } from '@/lib/api/lyft-client';

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Get access token from cookie
    const accessToken = cookieStore.get('citibike_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated. Please log in.' }, { status: 401 });
    }

    // Use unified Lyft client
    const lyftClient = getLyftClient();
    const data = await lyftClient.getUserSubscriptions(accessToken);

    return NextResponse.json({
      success: true,
      subscriptions: data,
      rawData: data, // Include raw data for debugging
    });
  } catch (error: unknown) {
    console.error('Subscriptions error:', error);

    // Handle ApiError from unified client
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const apiError = error as { statusCode: number; message: string; code: string };

      if (apiError.statusCode === 401) {
        return NextResponse.json(
          { error: 'Authentication expired. Please log in again.' },
          { status: 401 }
        );
      }

      return NextResponse.json({ error: apiError.message }, { status: apiError.statusCode });
    }

    return NextResponse.json(
      {
        error: 'An error occurred fetching subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
