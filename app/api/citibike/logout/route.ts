// Citibike Logout Endpoint
// Clears authentication cookies

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Delete all Citibike-related cookies
    cookieStore.delete('citibike_access_token');
    cookieStore.delete('citibike_refresh_token');
    cookieStore.delete('citibike_temp_session');
    cookieStore.delete('citibike_temp_client_session');
    cookieStore.delete('citibike_temp_phone');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred during logout',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
