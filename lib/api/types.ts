/**
 * API Response Types
 * Type definitions for Lyft/Citibike API responses
 */

// ============================================
// OAuth Response Types
// ============================================

export interface OAuthTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  user_id?: string;
  scope?: string;
  extension_code?: string;
}

export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
  challenges?: Array<{
    identifier: string;
    data: string;
    status: string[];
  }>;
  prompt_actions?: Array<{
    action: string;
    message: string;
  }>;
}

// ============================================
// User Response Types
// ============================================

export interface PassengerResponse {
  id?: string;
  user_id?: string;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone_number?: string;
  phoneNumber?: string;
  membership_type?: string;
  join_date_ms?: number;
  rides_taken?: number;
  region?: string;
  user_photo?: string;
  referral_code?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptions?: {
    subscriptions?: Array<{
      package_title?: string;
      package_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      auto_renew?: boolean;
      price?: {
        amount: number;
        currency: string;
      };
    }>;
  };
}

// ============================================
// Station Response Types
// ============================================

export interface StationInfoResponse {
  last_updated: number;
  ttl: number;
  version: string;
  data: {
    stations: Array<{
      station_id: string;
      name: string;
      short_name: string;
      lat: number;
      lon: number;
      region_id?: string;
      rental_methods?: string[];
      capacity: number;
      rental_url?: string;
      eightd_has_key_dispenser: boolean;
      has_kiosk?: boolean;
      external_id?: string;
      electric_bike_surcharge_waiver?: boolean;
      legacy_id?: string;
    }>;
  };
}

export interface StationStatusResponse {
  last_updated: number;
  ttl: number;
  version: string;
  data: {
    stations: Array<{
      station_id: string;
      num_bikes_available: number;
      num_bikes_available_types?: {
        mechanical?: number;
        ebike?: number;
      };
      num_bikes_disabled?: number;
      num_docks_available: number;
      num_docks_disabled?: number;
      is_installed: number;
      is_renting: number;
      is_returning: number;
      last_reported: number;
      eightd_has_available_keys?: boolean;
      legacy_id?: string;
      station_status?: string;
    }>;
  };
}

// ============================================
// Combined Response Types
// ============================================

export type LyftApiResponse<T> = T | OAuthErrorResponse;

export function isOAuthError(response: unknown): response is OAuthErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as OAuthErrorResponse).error === 'string'
  );
}

export function isOAuthTokenResponse(response: unknown): response is OAuthTokenResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'access_token' in response &&
    typeof (response as OAuthTokenResponse).access_token === 'string'
  );
}
