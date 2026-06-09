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
import * as Device from 'expo-device';
import { EVO_PRODUCTION_API_URL } from '@evoconn/constants/productionApi';
import { getLocalDayKey } from '@evoconn/services/userStatsStorage';

/** Active Supabase user id — set from AuthContext when profile loads. */
let _apiUserId: string | undefined;

export function setApiUserId(userId: string | undefined): void {
  _apiUserId = userId?.trim() || undefined;
}

export function getApiUserId(): string | undefined {
  return _apiUserId;
}

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Simulador iOS / emulador Android no alcanzan la IP LAN del Mac (192.168.x, 172.x…).
 * Si el .env apunta a :8000 en una IP local, reescribimos a loopback del host.
 */
function resolveApiUrlForCurrentRuntime(url: string): string {
  const u = stripTrailingSlash(url);
  if (!__DEV__ || Device.isDevice) return u;

  const isLocalDevBackend =
    /:8000\/?$/.test(u) &&
    (u.includes('127.0.0.1') ||
      u.includes('localhost') ||
      u.includes('10.0.2.2') ||
      /^https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(u));

  if (!isLocalDevBackend) return u;

  return Platform.select({
    android: 'http://10.0.2.2:8000',
    ios: 'http://127.0.0.1:8000',
    default: u,
  }) as string;
}

/**
 * Base URL del backend FastAPI (Railway en producción).
 * 1. EXPO_PUBLIC_API_URL del bundle (EAS / .env) — fuente de verdad en releases.
 * 2. En simulador con backend local → 127.0.0.1:8000 automático.
 * 3. Railway — fallback en dispositivo real / release.
 */
export function getDefaultApiUrl(): string {
  const raw =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  if (raw.length) return resolveApiUrlForCurrentRuntime(raw);
  if (!__DEV__ || Device.isDevice) return EVO_PRODUCTION_API_URL;
  return Platform.select({
    android: 'http://10.0.2.2:8000',
    ios: 'http://127.0.0.1:8000',
    default: EVO_PRODUCTION_API_URL,
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
  if (_apiUserId) out['x-user-id'] = _apiUserId;
  out['x-client-date'] = getLocalDayKey();
  const apiUrl = getDefaultApiUrl();
  if (apiUrl.includes('ngrok')) {
    out['ngrok-skip-browser-warning'] = '1';
  }
  if (apiUrl.includes('loca.lt')) {
    out['Bypass-Tunnel-Reminder'] = 'true';
  }
  return out;
}
