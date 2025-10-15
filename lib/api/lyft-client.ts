/**
 * Lyft API Client
 * Specialized client for interacting with Lyft/Citibike API
 */

import { ApiError, BaseApiClient } from './client';
import { API_CONFIG, createBasicAuth, createLyftHeaders, LYFT_ENDPOINTS } from '@/config/api';
import { getCitibikeCredentials } from '@/config/environment';
import { ErrorCode, MAP_CONSTANTS } from '@/config/constants';
import {
  createDeviceIdentifiers,
  createEmptyIdentifiers,
  createSession,
  encodeIdentifiers,
  type SessionInfo,
} from './session';
import type { CitibikeAuthResponse, CitibikeUser, OTPRequestResponse } from '@/lib/types';
import type {
  LyftApiResponse,
  OAuthErrorResponse,
  OAuthTokenResponse,
  PassengerResponse,
} from './types';

// ============================================
// Lyft API Client
// ============================================
export class LyftApiClient extends BaseApiClient {
  private credentials: { clientId: string; clientSecret: string } | null;
  private sessionInfo = createSession();
  private appAccessToken: string | null = null;

  constructor() {
    super(API_CONFIG.LYFT.BASE_URL);
    this.credentials = getCitibikeCredentials();
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Get app-level access token (client credentials flow)
   */
  async getAppAccessToken(): Promise<string> {
    // Return cached token if available
    if (this.appAccessToken) {
      return this.appAccessToken;
    }

    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    const response = await this.post<OAuthTokenResponse>(
      LYFT_ENDPOINTS.OAUTH.TOKEN,
      { grant_type: 'client_credentials' },
      {
        headers: {
          ...headers,
          authorization: basicAuth,
        },
      }
    );

    this.appAccessToken = response.access_token;

    // Clear token before it expires
    if (response.expires_in) {
      setTimeout(
        () => {
          this.appAccessToken = null;
        },
        (response.expires_in - 60) * 1000
      ); // Clear 1 minute before expiry
    }

    return this.appAccessToken;
  }

  // ============================================
  // OAuth Methods
  // ============================================

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<CitibikeAuthResponse> {
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await this.post<LyftApiResponse<OAuthTokenResponse>>(
      LYFT_ENDPOINTS.OAUTH.TOKEN,
      params,
      {
        headers: {
          ...headers,
          authorization: basicAuth,
        },
      }
    );

    return this.parseAuthResponse(response);
  }

  /**
   * Exchange phone and OTP for user access token
   */
  async verifyOtp(
    phoneNumber: string,
    code: string,
    sessionId?: string
  ): Promise<CitibikeAuthResponse> {
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);
    const identifiers = createDeviceIdentifiers();

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    const params = new URLSearchParams({
      grant_type: 'urn:lyft:oauth2:grant_type:phone',
      phone_number: phoneNumber,
      phone_code: code,
      identifiers: encodeIdentifiers(identifiers),
    });

    if (sessionId) {
      params.append('session_id', sessionId);
    }

    const response = await this.post<LyftApiResponse<OAuthTokenResponse>>(
      LYFT_ENDPOINTS.OAUTH.TOKEN,
      params,
      {
        headers: {
          ...headers,
          authorization: basicAuth,
        },
      }
    );

    // Check if email challenge is required
    if ('error' in response && response.error === 'challenge_required') {
      throw new ApiError(
        response.error_description || 'Email verification required',
        ErrorCode.CHALLENGE_REQUIRED,
        401,
        response
      );
    }

    return this.parseAuthResponse(response);
  }

  /**
   * Complete email challenge
   */
  async verifyEmailChallenge(
    phoneNumber: string,
    code: string,
    email: string
  ): Promise<CitibikeAuthResponse> {
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    const params = new URLSearchParams({
      email: email,
      grant_type: 'urn:lyft:oauth2:grant_type:phone',
      identifiers: createEmptyIdentifiers(),
      phone_code: code,
      phone_number: phoneNumber,
    });

    const response = await this.post<LyftApiResponse<OAuthTokenResponse>>(
      LYFT_ENDPOINTS.OAUTH.TOKEN,
      params,
      {
        headers: {
          ...headers,
          authorization: basicAuth,
        },
      }
    );

    return this.parseAuthResponse(response);
  }

  /**
   * Request OTP code via SMS
   */
  async requestOtp(
    phoneNumber: string
  ): Promise<OTPRequestResponse & { sessionInfo: SessionInfo }> {
    // First get app token
    const appToken = await this.getAppAccessToken();

    const headers = createLyftHeaders({
      token: appToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      idlSource: 'pb.api.endpoints.v1.phone_auth.CreatePhoneAuthRequest',
    });

    await this.post(
      LYFT_ENDPOINTS.AUTH.PHONE_AUTH,
      {
        phone_number: phoneNumber,
        voice_verification: false,
      },
      { headers }
    );

    return {
      success: true,
      message: 'Verification code sent! Check your phone for a text from +1 (833) 504-2560.',
      expiresIn: 300,
      sessionInfo: this.sessionInfo,
    };
  }

  // ============================================
  // User Methods
  // ============================================

  /**
   * Get stations with Bike Angel rewards (map-items endpoint)
   */
  async getStationsWithRewards(
    accessToken: string,
    location: { lat: number; lon: number },
    radiusKm: number = 1
  ): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      idlSource: 'pb.api.endpoints.v1.last_mile.ReadMapItemsRequest',
    });

    // Add location and region headers
    headers['x-location'] = `${location.lat},${location.lon}`;
    headers['x-lyft-region'] = ''; // Empty region for map-items

    const requestBody = {
      last_mile_context: {
        origin_lat: location.lat,
        origin_long: location.lon,
        radius_km: radiusKm,
        result_filters: ['is_bike', 'show_rider_rewards', 'bff_fidget_enabled'],
      },
    };

    const response = await this.post<Record<string, unknown>>(
      LYFT_ENDPOINTS.LAST_MILE.MAP_ITEMS,
      requestBody,
      { headers }
    );

    return response;
  }

  /**
   * Get Bike Angel profile and points
   */
  async getBikeAngelProfile(
    accessToken: string,
    location?: { lat: number; lon: number }
  ): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      // Removed isProtobuf flag to request JSON instead of protobuf
      idlSource: 'pb.api.endpoints.v1.lbs_bff.ReadBikeAngelProfileScreenRequest',
    });

    // Add location and region headers
    const coords = location || MAP_CONSTANTS.DEFAULT_CENTER;
    headers['x-location'] = `${coords.lat},${coords.lon}`;
    headers['x-lyft-region'] = 'BKN'; // Brooklyn region for NYC

    // Canvas capabilities from the cURL request
    const requestBody = {
      canvas_capabilities: {
        accessibility_capabilities: {
          accessibility_traits: true,
          additional_accessibility_actions: true,
          hidden_accessibilty: true,
          toggleable_accessibility: true,
        },
        actions_capabilities: {
          common_actions: true,
          complete_action: true,
          deep_link_open_in_external_browser: true,
        },
        alert_capabilities: {
          alert: true,
        },
        command_capabilities: {
          back_to_screen_by_id: true,
          replace_screen_by_id: true,
          show_info_panel: true,
          show_prompt_screen: true,
          show_toast: true,
        },
        image_capabilities: {
          custom_renderer: true,
          gif: true,
        },
        label_capabilities: {
          disabled: true,
          line_count: true,
          rich_text: true,
        },
        layout_child_capabilities: {
          carousel: true,
          circular_button: true,
          circular_meter: true,
          custom_layout: true,
          icon_button: true,
          list_section: true,
          placeholder_element: true,
          radio_group: true,
          segmented_control: true,
          slider_button: true,
          switch_element: true,
          toggle_button: true,
          toggle_group: true,
        },
        screen_capabilities: {
          dismiss_actions: true,
          header: true,
        },
        toast_capabilities: {
          toast: true,
        },
      },
      server_actions: {},
      show_edu_in_panel: false,
    };

    const response = await this.post<Record<string, unknown>>(
      LYFT_ENDPOINTS.LAST_MILE.BIKE_ANGEL_PROFILE,
      requestBody,
      { headers }
    );

    return response;
  }

  /**
   * Get user profile/passenger info
   */
  async getUserProfile(accessToken: string): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    headers['x-location'] =
      `${MAP_CONSTANTS.DEFAULT_CENTER.lat},${MAP_CONSTANTS.DEFAULT_CENTER.lon}`; // Default NYC location
    headers['x-idl-source'] = 'pb.api.endpoints.v1.passenger.ReadPassengerUserRequest';
    headers['accept'] = 'application/x-protobuf,application/json';

    const response = await this.get<Record<string, unknown>>(LYFT_ENDPOINTS.USER.PASSENGER, {
      headers,
    });

    return response;
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(accessToken: string): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
    });

    headers['x-location'] =
      `${MAP_CONSTANTS.DEFAULT_CENTER.lat},${MAP_CONSTANTS.DEFAULT_CENTER.lon}`; // Default NYC location
    headers['x-idl-source'] = 'pb.api.endpoints.v1.subscriptions.ReadSubscriptionsRequest';

    const response = await this.get<Record<string, unknown>>(LYFT_ENDPOINTS.USER.SUBSCRIPTIONS, {
      headers,
    });

    return response;
  }

  /**
   * Get individual trip details with station coordinates and polyline
   */
  async getTripDetails(
    accessToken: string,
    rideId: string,
    location?: { lat: number; lon: number }
  ): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      idlSource: 'pb.api.endpoints.v1.last_mile.ReadLastMileRideHistoryResourceRequest',
    });

    // Add location and region headers
    const coords = location || MAP_CONSTANTS.DEFAULT_CENTER;
    headers['x-location'] = `${coords.lat},${coords.lon}`;
    headers['x-lyft-region'] = 'BKN'; // Brooklyn region for NYC
    headers['x-capture-path-template'] = '/v1/last-mile/ride-history/{ride_id}';

    const response = await this.get<Record<string, unknown>>(
      `${LYFT_ENDPOINTS.TRIPS.TRIP_DETAILS(rideId)}?ride_id=${rideId}`,
      { headers }
    );

    return response;
  }

  /**
   * Get trip history
   */
  async getTripHistory(
    accessToken: string,
    options: {
      startTime?: number;
      endTime?: number;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{
    trips: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      // Force JSON response by only setting isJson (not isProtobuf)
      idlSource: 'pb.api.endpoints.v1.ride_history.ReadTripHistoryRequest',
    });

    // Add location and region headers
    headers['x-location'] =
      `${MAP_CONSTANTS.DEFAULT_CENTER.lat},${MAP_CONSTANTS.DEFAULT_CENTER.lon}`; // NYC coordinates
    headers['x-lyft-region'] = 'BKN'; // Brooklyn region for NYC

    // Build request body
    const requestBody: Record<string, unknown> = {
      source: 1, // Source type for Citibike rides
    };

    // Only add start_time if explicitly provided
    if (options.startTime !== undefined) {
      requestBody.start_time = options.startTime;
    }
    if (options.endTime !== undefined) {
      requestBody.end_time = options.endTime;
    }
    if (options.limit !== undefined) {
      requestBody.limit = options.limit;
    }
    if (options.cursor !== undefined) {
      requestBody.cursor = options.cursor;
    }

    console.log('🚀 Trip history request:', JSON.stringify(requestBody, null, 2));
    console.log('🚀 Trip history Accept header:', headers['accept']);

    // Make raw fetch request to bypass BaseApiClient's protobuf handling
    const url = `${this.baseUrl}${LYFT_ENDPOINTS.TRIPS.TRIP_HISTORY}`;
    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseContentType = fetchResponse.headers.get('content-type');
    console.log('📦 Trip history response content-type:', responseContentType);

    if (!fetchResponse.ok) {
      throw new Error(`Trip history request failed: ${fetchResponse.status}`);
    }

    // Check if we got JSON or protobuf
    if (responseContentType?.includes('application/json')) {
      const jsonResponse = await fetchResponse.json();
      console.log('📦 Trip history JSON response:', JSON.stringify(jsonResponse, null, 2));

      // Parse JSON response
      const trips: Array<Record<string, unknown>> = [];

      // Iterate through sections and groupings to extract trips
      if (jsonResponse.sections && Array.isArray(jsonResponse.sections)) {
        for (const section of jsonResponse.sections) {
          if (section.groupings && Array.isArray(section.groupings)) {
            for (const grouping of section.groupings) {
              if (grouping.rows && Array.isArray(grouping.rows)) {
                for (const row of grouping.rows) {
                  if (row.trip_row) {
                    const tripRow = row.trip_row;
                    const bikeType = tripRow.image_url?.includes('cosmo') ? 'ebike' : 'classic';

                    // Calculate duration in seconds
                    const duration =
                      tripRow.end_time && tripRow.start_time
                        ? Math.floor((tripRow.end_time - tripRow.start_time) / 1000)
                        : undefined;

                    // Estimate distance from duration
                    // Based on actual Citibike data: 742 miles / 4911 minutes = 0.151 mi/min = 9.06 mph average
                    // Convert to meters: 0.151 mi/min * 1609.34 m/mi / 60 sec/min ≈ 4.05 m/s
                    const METERS_PER_SECOND = 4.05;
                    const estimatedDistance = duration
                      ? Math.round(duration * METERS_PER_SECOND)
                      : undefined;

                    const trip: Record<string, unknown> = {
                      id: tripRow.id,
                      startTime: tripRow.start_time,
                      endTime: tripRow.end_time,
                      duration,
                      title: tripRow.title,
                      timezone: tripRow.timezone,
                      bikeType,
                      bikeImageUrl: tripRow.image_url,
                      angelPoints: tripRow.points_earned || 0,
                      angelBadgeText: tripRow.lastmile_rewards_badge?.text,
                      costCents: tripRow.total_money?.amount || 0,
                      cost: tripRow.total_money?.amount
                        ? (tripRow.total_money.amount / 100).toFixed(2)
                        : '0.00',
                      costFormatted: tripRow.total_money?.amount
                        ? `$${(tripRow.total_money.amount / 100).toFixed(2)}`
                        : '$0.00',
                      currency: tripRow.total_money?.currency || 'USD',
                      // Add estimated distance and placeholder station data
                      distance: estimatedDistance,
                      startStationId: '',
                      startStationName: 'Unknown',
                      startLat: 0,
                      startLon: 0,
                      endStationId: '',
                      endStationName: 'Unknown',
                      endLat: 0,
                      endLon: 0,
                    };

                    trips.push(trip);
                  }
                }
              }
            }
          }
        }
      }

      console.log(`✅ Parsed ${trips.length} trips from JSON`);

      return {
        trips,
        hasMore: jsonResponse.has_more || false,
        nextCursor: jsonResponse.next_page_start_time
          ? jsonResponse.next_page_start_time.toString()
          : null,
      };
    } else {
      console.log('⚠️  API still returned protobuf despite Accept: application/json header');
      console.log('⚠️  Content-Type:', responseContentType);

      // Fall back to empty response
      return {
        trips: [],
        hasMore: false,
        nextCursor: null,
      };
    }
  }

  /**
   * Reset session (for new auth flow)
   */
  resetSession(): void {
    this.sessionInfo = createSession();
    this.appAccessToken = null;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Ensure credentials are available
   */
  private requireCredentials(): { clientId: string; clientSecret: string } {
    if (!this.credentials) {
      throw new ApiError(
        'Citibike API credentials not configured',
        ErrorCode.INVALID_CREDENTIALS,
        500
      );
    }
    return this.credentials;
  }

  /**
   * Parse authentication response
   */
  private parseAuthResponse(data: OAuthTokenResponse | OAuthErrorResponse): CitibikeAuthResponse {
    // Check if it's an error response
    if ('error' in data) {
      throw new ApiError(data.error_description || data.error, data.error, 401, data);
    }

    const user: CitibikeUser = {
      id: data.user_id || 'unknown',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      membershipType: 'member',
      memberSince: undefined,
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
      user,
    };
  }

  /**
   * Parse user profile response
   */
  private parseUserProfile(data: PassengerResponse): CitibikeUser {
    return {
      id: data.id || data.user_id || 'unknown',
      email: data.email || '',
      firstName: data.first_name || data.firstName || '',
      lastName: data.last_name || data.lastName || '',
      phoneNumber: data.phone_number || data.phoneNumber || '',
      membershipType: data.membership_type || 'member',
      memberSince: data.join_date_ms ? new Date(data.join_date_ms).toISOString() : undefined,
      ridesTaken: data.rides_taken || 0,
      region: data.region || '',
      userPhoto: data.user_photo || '',
      referralCode: data.referral_code || '',
    };
  }
}

// ============================================
// Singleton Instance
// ============================================
let lyftClientInstance: LyftApiClient | null = null;

/**
 * Get singleton Lyft API client instance
 */
export function getLyftClient(): LyftApiClient {
  if (!lyftClientInstance) {
    lyftClientInstance = new LyftApiClient();
  }
  return lyftClientInstance;
}
