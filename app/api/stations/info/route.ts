/**
 * Station Information API
 * Proxies GBFS station_information.json data
 */

import { NextResponse } from 'next/server';
import { buildCityGbfsUrl, DEFAULT_CITY_ID } from '@/config/cities';
import { GBFS_ENDPOINTS } from '@/lib/gbfs';
import { createErrorResponse } from '@/lib/api/response-helpers';

export async function GET(request: Request) {
  try {
    // Get city from query parameter, default to NYC
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('city') || DEFAULT_CITY_ID;

    const url = buildCityGbfsUrl(cityId, GBFS_ENDPOINTS.STATION_INFO);

    const response = await fetch(url, {
      next: {
        revalidate: 86400, // Cache for 24 hours (station info doesn't change often)
      },
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GBFS API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch station information:', error);

    return NextResponse.json(
      createErrorResponse(
        'Failed to fetch station information',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      { status: 500 }
    );
  }
}
