// Dynamically resolve API URL using Vite environment variables, falling back to local dev server.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+$/i, '');

export type ApiBody = BodyInit | Record<string, unknown> | unknown[] | null | undefined;

export function apiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalized}`;
}

export function apiAssetUrl(path?: string | null, fallback = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80'): string {
  if (!path) return fallback;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}

function getErrorMessage(errorData: unknown, fallback: string): string {
  if (!errorData || typeof errorData !== 'object') return fallback;

  const data = errorData as Record<string, unknown>;
  const detail = data.detail ?? data.message ?? data.error;

  if (typeof detail === 'string') return detail;
  if (detail) return JSON.stringify(detail);

  return fallback;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('agricosmo-token');
  const headers = new Headers(options.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set default JSON content type if no content-type is provided in options.
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(endpoint), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('agricosmo-token');
    // We use a slight delay so they can see the error or toast if needed,
    // but in this case an immediate redirect to clear state is best.
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const raw = await response.text();
    let errorData: unknown = null;
    try {
      errorData = raw ? JSON.parse(raw) : null;
    } catch {
      errorData = { message: raw };
    }
    const message = getErrorMessage(errorData, `Request failed with status ${response.status}`);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  return raw ? JSON.parse(raw) : (undefined as T);
}

function encodeBody(body: ApiBody): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData || body instanceof Blob || typeof body === 'string' || body instanceof URLSearchParams) {
    return body;
  }
  return JSON.stringify(body);
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: ApiBody, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: encodeBody(body),
    }),
  put: <T>(endpoint: string, body: ApiBody, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: encodeBody(body),
    }),
  patch: <T>(endpoint: string, body: ApiBody, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: encodeBody(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
