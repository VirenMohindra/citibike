import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('citibike_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get location from query params if provided
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    const location = lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : undefined;

    // Use the Lyft client to fetch Bike Angel profile
    const lyftClient = getLyftClient();
    const bikeAngelData = await lyftClient.getBikeAngelProfile(accessToken, location);

    return NextResponse.json({
      success: true,
      data: bikeAngelData,
    });
  } catch (error: unknown) {
    console.error('Error fetching Bike Angel profile:', error);

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
      { error: apiError.message || 'Failed to fetch Bike Angel profile' },
      { status: apiError.status || 500 }
    );
  }
}
