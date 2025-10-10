/**
 * Base API Client
 * Handles common API logic like error handling, retries, and logging
 */

import { REQUEST_CONFIG } from '@/config/api';
import { ErrorCode } from '@/config/constants';

// ============================================
// Types
// ============================================
export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiErrorResponse {
  error: string;
  error_description?: string;
  details?: unknown;
  statusCode: number;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ErrorCode | string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// Request Helpers
// ============================================

/**
 * Add timeout to a fetch request
 */
function fetchWithTimeout(
  url: string,
  options: ApiRequestOptions = {},
  timeoutMs: number = REQUEST_CONFIG.TIMEOUT.DEFAULT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

/**
 * Retry a fetch request with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: ApiRequestOptions = {},
  maxRetries: number = REQUEST_CONFIG.RETRY.MAX_ATTEMPTS,
  baseDelay: number = REQUEST_CONFIG.RETRY.DELAY_MS
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, options.timeout);

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on server errors (5xx) or network errors
      if (response.ok) {
        return response;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's a client error or abort
      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Last attempt, don't delay
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(REQUEST_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.warn(`Retry attempt ${attempt + 1} for ${url} after ${delay}ms`);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// ============================================
// Base API Client
// ============================================
export class BaseApiClient {
  protected baseUrl: string;
  protected defaultHeaders: HeadersInit;
  protected defaultOptions: ApiRequestOptions;

  constructor(
    baseUrl: string,
    defaultHeaders: HeadersInit = {},
    defaultOptions: ApiRequestOptions = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
    this.defaultOptions = {
      timeout: REQUEST_CONFIG.TIMEOUT.DEFAULT,
      retries: REQUEST_CONFIG.RETRY.MAX_ATTEMPTS,
      retryDelay: REQUEST_CONFIG.RETRY.DELAY_MS,
      ...defaultOptions,
    };
  }

  /**
   * Make an API request
   */
  protected async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions: ApiRequestOptions = {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      // Log request in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 ${requestOptions.method || 'GET'} ${url}`);
      }

      const response = await fetchWithRetry(
        url,
        requestOptions,
        requestOptions.retries,
        requestOptions.retryDelay
      );

      // Handle non-OK responses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse response
      const contentType = response.headers.get('content-type');

      // Debug logging for trip history
      if (url.includes('triphistory')) {
        console.log('Response content-type:', contentType);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      }

      if (contentType?.includes('application/json')) {
        const jsonResponse = await response.json();
        // Debug logging for trip history
        if (url.includes('triphistory')) {
          console.log('JSON Response:', JSON.stringify(jsonResponse, null, 2));
        }
        return jsonResponse;
      } else if (contentType?.includes('text/')) {
        return (await response.text()) as unknown as T;
      } else {
        return (await response.blob()) as unknown as T;
      }
    } catch (error) {
      this.handleError(error);
      throw error; // Re-throw after handling
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: this.prepareBody(body, options?.headers),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: this.prepareBody(body, options?.headers),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Build full URL
   */
  protected buildUrl(endpoint: string): string {
    // If endpoint is already a full URL, use it as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Ensure no double slashes
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${cleanBase}/${cleanEndpoint}`;
  }

  /**
   * Prepare request body based on content type
   */
  protected prepareBody(body: unknown, headers?: HeadersInit): string | FormData | undefined {
    if (!body) return undefined;

    const contentType = this.getContentType(headers);

    if (contentType?.includes('application/json')) {
      return JSON.stringify(body);
    }

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      if (body instanceof URLSearchParams) {
        return body.toString();
      }
      return new URLSearchParams(body as Record<string, string>).toString();
    }

    if (body instanceof FormData) {
      return body;
    }

    // Default to JSON
    return JSON.stringify(body);
  }

  /**
   * Get content type from headers
   */
  protected getContentType(headers?: HeadersInit): string | null {
    if (!headers) return null;

    if (headers instanceof Headers) {
      return headers.get('content-type');
    }

    if (Array.isArray(headers)) {
      const contentTypeHeader = headers.find(([key]) => key.toLowerCase() === 'content-type');
      return contentTypeHeader?.[1] || null;
    }

    const headerObj = headers as Record<string, string>;
    return headerObj['content-type'] || headerObj['Content-Type'] || null;
  }

  /**
   * Handle error responses
   */
  protected async handleErrorResponse(response: Response): Promise<never> {
    let errorData: {
      error?: string;
      error_description?: string;
      message?: string;
      [key: string]: unknown;
    } = {};

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: response.statusText };
    }

    // Log 403 errors for debugging (likely rate limiting)
    if (response.status === 403) {
      console.warn('🔒 403 Forbidden - Likely rate limited:', {
        url: response.url.split('?')[0], // Don't log full URL with params
        error: errorData.error,
      });
    }

    // Map to error codes
    let errorCode: ErrorCode | string = ErrorCode.SERVER_ERROR;
    if (response.status === 401) {
      errorCode =
        errorData.error === 'challenge_required'
          ? ErrorCode.CHALLENGE_REQUIRED
          : ErrorCode.INVALID_CREDENTIALS;
    } else if (response.status === 403) {
      // CloudFront rate limiting returns 403 with "forbidden" error
      // Session expiry/authentication returns 403 with other errors like "challenge_required"
      if (errorData.error === 'forbidden') {
        errorCode = ErrorCode.RATE_LIMITED;
      } else {
        errorCode = ErrorCode.SESSION_EXPIRED;
      }
    } else if (response.status === 404) {
      errorCode = ErrorCode.NOT_FOUND;
    } else if (response.status === 429) {
      errorCode = ErrorCode.RATE_LIMITED;
    } else if (response.status >= 500) {
      errorCode = ErrorCode.SERVER_ERROR;
    }

    throw new ApiError(
      errorData.error_description || errorData.error || errorData.message || 'API request failed',
      errorCode,
      response.status,
      errorData
    );
  }

  /**
   * Handle general errors
   */
  protected handleError(error: unknown): void {
    if (error instanceof ApiError) {
      console.error(`API Error [${error.code}]:`, error.message, error.details);
      return;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Request timeout:', error.message);
        throw new ApiError('Request timeout', ErrorCode.TIMEOUT, 408);
      }

      console.error('Request failed:', error.message);
      throw new ApiError(error.message, ErrorCode.NETWORK_ERROR, 0, {
        originalError: error.message,
      });
    }

    console.error('Unknown error:', error);
    throw new ApiError('Unknown error occurred', ErrorCode.SERVER_ERROR, 500, error);
  }

  /**
   * Set default header
   */
  setDefaultHeader(key: string, value: string): void {
    if (this.defaultHeaders instanceof Headers) {
      this.defaultHeaders.set(key, value);
    } else if (Array.isArray(this.defaultHeaders)) {
      this.defaultHeaders.push([key, value]);
    } else {
      (this.defaultHeaders as Record<string, string>)[key] = value;
    }
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(key: string): void {
    if (this.defaultHeaders instanceof Headers) {
      this.defaultHeaders.delete(key);
    } else if (Array.isArray(this.defaultHeaders)) {
      const index = this.defaultHeaders.findIndex(([k]) => k === key);
      if (index !== -1) {
        this.defaultHeaders.splice(index, 1);
      }
    } else {
      delete (this.defaultHeaders as Record<string, string>)[key];
    }
  }
}
