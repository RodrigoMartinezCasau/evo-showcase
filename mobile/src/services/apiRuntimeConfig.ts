/**
 * Unified API runtime config for all mobile → FastAPI backend callers.
 *
 * - EXPO_PUBLIC_API_URL — required for TestFlight / production builds
 *   (public HTTPS URL, e.g. https://api.your-domain.com).
 * - EXPO_PUBLIC_API_KEY — optional; must equal the server's TESTER_API_KEY when set.
 *
 * Embed API keys cautiously (extractable from the bundle); rotate often for betas.
 */
import { Platform } from 'react-native';

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Base URL without trailing slash (same rules as simulator defaults). */
export function getDefaultApiUrl(): string {
  const raw =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  if (raw.length) return stripTrailingSlash(raw);
  return Platform.select({
    android: 'http://10.0.2.2:8000',
    default: 'http://127.0.0.1:8000',
  }) as string;
}

/** Shared client API secret when backend sets TESTER_API_KEY. */
export function getPublicApiKey(): string | undefined {
  const raw =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_KEY
      ? String(process.env.EXPO_PUBLIC_API_KEY).trim()
      : '';
  return raw.length ? raw : undefined;
}

export function mergeApiHeaders(extra?: Record<string, string>): Record<string, string> {
  const out = { ...(extra ?? {}) };
  const k = getPublicApiKey();
  if (k) out['x-api-key'] = k;
  return out;
}
