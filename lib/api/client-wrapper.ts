/**
 * Client-Side API Wrapper with Automatic Token Refresh
 * Wraps API calls to automatically refresh tokens on 401 errors
 */

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean;
}

/**
 * Fetch wrapper that automatically refreshes token on 401 and retries
 */
export async function fetchWithTokenRefresh(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipRefresh, ...fetchOptions } = options;

  try {
    const response = await fetch(url, fetchOptions);

    // If we get a 401 and haven't already tried refreshing, attempt refresh and retry
    if (response.status === 401 && !skipRefresh) {
      console.log('🔑 Got 401, attempting token refresh...');

      try {
        // Attempt to refresh the token
        const refreshResponse = await fetch('/api/citibike/refresh', {
          method: 'POST',
        });

        if (refreshResponse.ok) {
          console.log('✅ Token refreshed, retrying original request...');

          // Retry the original request with the new token (skip refresh to avoid loop)
          return fetch(url, {
            ...fetchOptions,
            skipRefresh: true,
          } as FetchOptions);
        } else {
          console.error('❌ Token refresh failed, returning original 401');
          return response;
        }
      } catch (refreshError) {
        console.error('❌ Token refresh error:', refreshError);
        return response;
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Helper to call API endpoints with automatic token refresh
 */
export async function apiCall<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithTokenRefresh(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API call failed: ${response.status}`);
  }

  return response.json();
}
