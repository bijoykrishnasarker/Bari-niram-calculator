import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasApiConfig, mobileConfig } from '../config';
import { getInstallationId } from './device';
import { supabase } from './supabase';

type ApiErrorPayload = {
  error?: { code?: string; message?: string };
};

export class MobileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'MobileApiError';
  }
}

type ApiOptions = RequestInit & {
  authenticated?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!hasApiConfig) {
    throw new MobileApiError(
      'API URL is not configured.',
      0,
      'API_NOT_CONFIGURED',
    );
  }

  const { authenticated = false, ...requestInit } = options;
  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (authenticated) {
    const [{ data }, installationId] = await Promise.all([
      supabase?.auth.getSession() ??
        Promise.resolve({ data: { session: null } }),
      getInstallationId(),
    ]);
    if (!data.session?.access_token) {
      throw new MobileApiError('Sign in is required.', 401, 'AUTH_REQUIRED');
    }
    headers.set('authorization', `Bearer ${data.session.access_token}`);
    headers.set('x-device-id', installationId);
  }

  const response = await fetch(`${mobileConfig.apiUrl}${path}`, {
    ...requestInit,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as T &
    ApiErrorPayload;

  if (!response.ok) {
    throw new MobileApiError(
      payload.error?.message ?? 'Request failed.',
      response.status,
      payload.error?.code ?? 'REQUEST_FAILED',
    );
  }

  return payload;
}

type CachedValue<T> = {
  expiresAt: number;
  etag: string | null;
  value: T;
};

export async function cachedPublicGet<T>(
  cacheKey: string,
  path: string,
  ttlMs: number,
): Promise<T> {
  const raw = await AsyncStorage.getItem(cacheKey);
  const cached = raw ? (JSON.parse(raw) as CachedValue<T>) : null;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!hasApiConfig) {
    if (cached) return cached.value;
    throw new MobileApiError(
      'API URL is not configured.',
      0,
      'API_NOT_CONFIGURED',
    );
  }

  try {
    const headers = new Headers();
    if (cached?.etag) headers.set('if-none-match', cached.etag);
    const response = await fetch(`${mobileConfig.apiUrl}${path}`, { headers });

    if (response.status === 304 && cached) {
      const refreshed = { ...cached, expiresAt: Date.now() + ttlMs };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(refreshed));
      return refreshed.value;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const value = (await response.json()) as T;
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        value,
        etag: response.headers.get('etag'),
        expiresAt: Date.now() + ttlMs,
      } satisfies CachedValue<T>),
    );
    return value;
  } catch (error) {
    if (cached) return cached.value;
    throw error;
  }
}
