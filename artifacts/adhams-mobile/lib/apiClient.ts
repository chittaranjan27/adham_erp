import { storage } from '@/lib/storage';

const RAW_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
// Strip trailing slash(es) to prevent double-slash URLs like /api//auth/login
const API_BASE = RAW_BASE.replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await storage.getItem('adhams_token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Guard: if the response isn't JSON (e.g. an HTML 404 page from a proxy),
  // throw a clear error instead of crashing on JSON.parse.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      `Server returned non-JSON response (${contentType || 'unknown'}). The API endpoint may not be available.`,
      res.status,
      'NOT_JSON',
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      err.error || err.message || 'Request failed',
      res.status,
      err.code
    );
  }

  return res.json();
}

// Convenience methods
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};
