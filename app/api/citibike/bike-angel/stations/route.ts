import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';
import type { MapItemsResponse, StationReward } from '@/lib/types';
import { SESSION_CONSTANTS, CITY_CONSTANTS } from '@/config/constants';

/**
 * GET /api/citibike/bike-angel/stations
 * Fetch stations with Bike Angel point rewards
 *
 * Query params:
 * - lat: Latitude (required)
 * - lon: Longitude (required)
 * - radius: Search radius in km (optional, default 0.5)
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token and selected city from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_CONSTANTS.ACCESS_TOKEN_COOKIE)?.value;
    const cityId =
      cookieStore.get(CITY_CONSTANTS.COOKIE_NAME)?.value || CITY_CONSTANTS.DEFAULT_CITY_ID;

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get location from query params
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const radius = searchParams.get('radius');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Location parameters (lat, lon) are required' },
        { status: 400 }
      );
    }

    const location = {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    };

    const radiusKm = radius ? parseFloat(radius) : 0.5;

    // Fetch stations with rewards from Lyft API using city-specific client
    const lyftClient = getLyftClient(cityId);

    const mapItemsData = (await lyftClient.getStationsWithRewards(
      accessToken,
      location,
      radiusKm
    )) as unknown as MapItemsResponse;

    // Get city config to use region-specific parsing
    const cityConfig = lyftClient['cityConfig']; // Access city config from client

    // Parse and simplify the response
    // Group by station ID to detect multiple reward badges (pickup vs dropoff)
    const stationRewardsMap = new Map<string, Partial<StationReward>>();

    if (mapItemsData.map_items) {
      for (const item of mapItemsData.map_items) {
        // Extract station ID from device.id (format: "motivate_<REGION>_<uuid>")
        // Region code varies by city: BKN (NYC), DC (DC), CHI (Chicago), etc.
        const deviceId = item.device.id;
        const regionPrefix = `motivate_${cityConfig.auth.regionCode}_`;
        const stationId = deviceId.replace(regionPrefix, '');

        const pin = item.collapsible_collection_bubble?.selected_detailed_text_specific_pin;
        // Check if station has reward badge
        const rewardBadge = pin?.reward_badge;
        // Extract bike and dock counts from text_specific_items
        const textItems = pin?.text_specific_items || [];

        // First item is bikes (icon 338), second is docks (icon 156)
        const numBikes = textItems[0] ? parseInt(textItems[0].text) : 0;
        const numDocks = textItems[1] ? parseInt(textItems[1].text) : 0;

        // Only process stations with reward badges
        if (rewardBadge && rewardBadge.points) {
          const pointValue = parseInt(rewardBadge.points);

          // Get or create station reward entry
          let stationReward = stationRewardsMap.get(stationId);
          if (!stationReward) {
            stationReward = {
              stationId,
              points: pointValue,
              numBikesAvailable: numBikes,
              numDocksAvailable: numDocks,
            };
            stationRewardsMap.set(stationId, stationReward);
          }

          // Determine direction based on icon type
          // Icon 114 = pickup (⬆️ - taking a bike FROM station)
          // Icon 99 = dropoff (⬇️ - returning a bike TO station)
          const iconType = rewardBadge.icon?.core_icon_v1 || rewardBadge.icon?.new_icon_v1;

          if (iconType === 114) {
            // Pickup reward (taking a bike FROM this station)
            stationReward.pickupPoints = pointValue;
          } else if (iconType === 99) {
            // Dropoff reward (returning a bike TO this station)
            stationReward.dropoffPoints = pointValue;
          } else {
            // Unknown icon type - treat as general reward (both directions)
            if (!stationReward.pickupPoints && !stationReward.dropoffPoints) {
              stationReward.pickupPoints = pointValue;
              stationReward.dropoffPoints = pointValue;
            }
          }

          // Update max points (for backward compatibility)
          stationReward.points = Math.max(
            stationReward.points || 0,
            stationReward.pickupPoints || 0,
            stationReward.dropoffPoints || 0
          );
        }
      }
    }

    const stationRewards: StationReward[] = Array.from(
      stationRewardsMap.values()
    ) as StationReward[];

    return NextResponse.json({
      success: true,
      data: {
        rewards: stationRewards,
        totalStations: mapItemsData.map_items?.length || 0,
        location,
        radiusKm,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching station rewards:', error);

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
      { error: apiError.message || 'Failed to fetch station rewards' },
      { status: apiError.status || 500 }
    );
  }
}
