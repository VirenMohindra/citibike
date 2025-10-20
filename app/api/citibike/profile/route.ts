// Citibike Profile Endpoint
// Fetches user profile data from Lyft API

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getLyftClient } from '@/lib/api/lyft-client';
import { SESSION_CONSTANTS, CITY_CONSTANTS } from '@/config/constants';

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Get access token from cookie
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated. Please log in.' }, { status: 401 });
    }

    // Get city from cookie (set by client when user switches cities)
    const cityId =
      cookieStore.get(CITY_CONSTANTS.COOKIE_NAME)?.value || CITY_CONSTANTS.DEFAULT_CITY_ID;

    // Use unified Lyft client with city context
    const lyftClient = getLyftClient(cityId);
    const data = await lyftClient.getUserProfile(accessToken);

    // Extract user info
    const user = {
      id: data.id || data.user_id || 'unknown',
      email: data.email || '',
      firstName: data.first_name || data.firstName || '',
      lastName: data.last_name || data.lastName || '',
      phoneNumber: data.phone_number || data.phoneNumber || '',
      membershipType: data.membership_type || 'member',
      memberSince:
        data.join_date_ms && typeof data.join_date_ms === 'number'
          ? new Date(data.join_date_ms).toISOString()
          : undefined,
      ridesTaken: data.rides_taken || 0,
      region: data.region || '',
      userPhoto: data.user_photo || '',
      referralCode: data.referral_code || '',
    };

    return NextResponse.json({
      success: true,
      user,
      rawData: data, // Include raw data for debugging
    });
  } catch (error: unknown) {
    console.error('Profile error:', error);

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
        error: 'An error occurred fetching profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
