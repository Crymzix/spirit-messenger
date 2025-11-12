/**
 * HTTP client for Backend Service API calls
 * Handles all write operations to the backend
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:6666';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

/**
 * Make an HTTP request to the Backend Service API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, token } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Make a GET request to the Backend Service API
 */
export async function apiGet<T>(
  endpoint: string,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', token });
}

/**
 * Make a POST request to the Backend Service API
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'POST', body, token });
}

/**
 * Make a PUT request to the Backend Service API
 */
export async function apiPut<T>(
  endpoint: string,
  body: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'PUT', body, token });
}

/**
 * Make a DELETE request to the Backend Service API
 */
export async function apiDelete<T>(
  endpoint: string,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE', token });
}
