// Auth-aware fetch wrapper. Token persists in localStorage.

const TOKEN_KEY = 'zq:token';
const USER_KEY  = 'zq:user';

// In dev, Vite proxies /api → backend (see vite.config.ts).
// In production set VITE_API_BASE_URL to the backend's public URL (e.g.
// https://zero-quebra-backend.up.railway.app). When empty, requests use
// same-origin /api which works for any deployment that fronts both with one URL.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const apiUrl = (path: string) => `${API_BASE}/api${path}`;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COO' | 'STORE_MANAGER' | 'SUPERVISOR';
  storeId: string | null;
};

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser:  (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setSession: (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message); this.status = status; this.body = body;
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = auth.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && typeof body === 'object' && 'error' in body)
      ? String((body as { error: unknown }).error)
      : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

export async function login(email: string, password: string) {
  const url = apiUrl('/auth/login');
  let r: Response;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    // Network failure (DNS, CORS, offline backend, blocked by mixed-content, etc.)
    throw new ApiError(0, `Network error reaching ${url} — ${(e as Error).message ?? 'fetch failed'}. Check VITE_API_BASE_URL on the frontend service points to a reachable backend.`, null);
  }

  // Distinguish "got JSON back" from "got HTML back" — the latter usually means
  // the request hit the frontend's own static server (because VITE_API_BASE_URL
  // wasn't set on the deploy) instead of the backend API.
  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await r.text().catch(() => '');
    const looksLikeHtml = text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<html');
    if (looksLikeHtml) {
      throw new ApiError(
        r.status,
        `Backend not reachable — request to ${url} returned HTML (status ${r.status}). The frontend is calling itself. Set VITE_API_BASE_URL on the frontend service to your backend's public URL and redeploy.`,
        text.slice(0, 200),
      );
    }
    throw new ApiError(r.status, `Unexpected response (${contentType || 'no content-type'}) from ${url}`, text.slice(0, 200));
  }

  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (body && typeof body === 'object' && 'error' in body)
      ? String((body as { error: unknown }).error)
      : `HTTP ${r.status}`;
    throw new ApiError(r.status, msg, body);
  }
  const data = body as { token: string; user: AuthUser };
  auth.setSession(data.token, data.user);
  return data.user;
}

export function logout() {
  auth.clear();
}
