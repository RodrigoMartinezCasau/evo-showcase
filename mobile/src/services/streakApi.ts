/**
 * API client for streak and uses-log endpoints.
 * Reuses the same base-URL logic as philosophyProfileApi.ts.
 */
import { Platform } from 'react-native';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

const _fromEnv =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
    ? String(process.env.EXPO_PUBLIC_API_URL).trim()
    : '';

const _defaultUrl = _fromEnv
  ? stripTrailingSlash(_fromEnv)
  : Platform.select({ android: 'http://10.0.2.2:8000', default: 'http://127.0.0.1:8000' });

let _apiUrl: string = _defaultUrl ?? 'http://127.0.0.1:8000';

export function setStreakApiBaseUrl(url: string) {
  _apiUrl = url.replace(/\/$/, '');
}

const TESTER_API_KEY: string | undefined = undefined;

function makeHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TESTER_API_KEY) h['x-api-key'] = TESTER_API_KEY;
  return h;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreakData = {
  streak_current: number;
  streak_best: number;
  last_activity_date: string | null;
  /** YYYY-MM-DD list of days with any activity */
  activity_log: string[];
  /** YYYY-MM-DD list of days with a frase */
  frases_log: string[];
  /** YYYY-MM-DD list of days with a reflexion */
  reflexiones_log: string[];
};

export type ActivityType = 'frase' | 'reflexion';

/** Map of YYYY-MM-DD → use count */
export type UsesLogData = Record<string, number>;

// ─── Streak ───────────────────────────────────────────────────────────────────

export async function fetchStreak(userId: string): Promise<StreakData> {
  const res = await fetch(`${_apiUrl}/streak/${userId}`, {
    headers: makeHeaders(),
  });
  if (!res.ok) throw new Error(`Streak fetch failed (${res.status})`);
  return res.json() as Promise<StreakData>;
}

export async function recordActivity(
  userId: string,
  type: ActivityType,
  date?: string,
): Promise<StreakData> {
  const body = { type, date: date ?? new Date().toISOString().slice(0, 10) };
  const res = await fetch(`${_apiUrl}/streak/${userId}/activity`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Record activity failed (${res.status})`);
  return res.json() as Promise<StreakData>;
}

// ─── Uses log ─────────────────────────────────────────────────────────────────

export async function fetchUsesLog(userId: string): Promise<UsesLogData> {
  const res = await fetch(`${_apiUrl}/uses-log/${userId}`, {
    headers: makeHeaders(),
  });
  if (!res.ok) throw new Error(`Uses log fetch failed (${res.status})`);
  const body = (await res.json()) as { uses_log: UsesLogData };
  return body.uses_log;
}

export async function recordUsesLog(userId: string): Promise<void> {
  await fetch(`${_apiUrl}/uses-log/${userId}/record`, {
    method: 'POST',
    headers: makeHeaders(),
  });
}
