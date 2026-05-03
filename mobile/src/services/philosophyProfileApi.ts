/**
 * API client for the philosophical profile AI endpoints.
 * Reuses the same base-URL logic as debateApi.ts.
 *
 * Generation endpoints each consume 1 daily use (enforced by backend middleware).
 * GET /philosophy-profile/{userId} is free (no usage counted).
 */
import { getDefaultApiUrl, mergeApiHeaders } from './apiRuntimeConfig';

let _apiUrl: string = getDefaultApiUrl();

export function setPhilApiBaseUrl(url: string) {
  _apiUrl = url.replace(/\/$/, '');
}

function makeHeaders(extra?: Record<string, string>): Record<string, string> {
  return mergeApiHeaders({ 'Content-Type': 'application/json', ...extra });
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json() as { detail?: string; error?: string };
    if (res.status === 429) return body.error ?? 'Sin usos disponibles. Inténtalo mañana.';
    return body.detail ?? body.error ?? `Error (${res.status})`;
  } catch {
    return `Error (${res.status})`;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClanPct = { clanId: string; label: string; pct: number };

export type PhilosophyContext = {
  username: string;
  clan_percentages: ClanPct[];
  rank: string;
  total_reflections: number;
  total_quotes: number;
  sample_reflections: string[];
  sample_phrases: string[];
  dominant_clan: string;
};

export type PhilosopherEntry = { name: string; pct: number };
export type BookEntry = { title: string; author: string };
export type JobEntry = { title: string; reason: string };

export type PhilosophyProfileData = {
  user_id: string;
  summary: string | null;
  summary_updated_at: string | null;
  philosophers: PhilosopherEntry[] | null;
  philosophers_updated_at: string | null;
  books: BookEntry[] | null;
  books_updated_at: string | null;
  jobs: JobEntry[] | null;
  jobs_updated_at: string | null;
};

// ─── API calls ────────────────────────────────────────────────────────────────

/** Fetch all stored blocks. No usage consumed. */
export async function fetchPhilosophyProfile(userId: string): Promise<PhilosophyProfileData> {
  const res = await fetch(`${_apiUrl}/philosophy-profile/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: makeHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<PhilosophyProfileData>;
}

/** Generate/regenerate summary. Costs 1 use. */
export async function generateSummary(
  userId: string,
  ctx: PhilosophyContext,
): Promise<{ summary: string; updated_at: string }> {
  const res = await fetch(`${_apiUrl}/philosophy-profile/${encodeURIComponent(userId)}/summary`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(ctx),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Generate/regenerate similar philosophers. Costs 1 use. */
export async function generatePhilosophers(
  userId: string,
  ctx: PhilosophyContext,
): Promise<{ philosophers: PhilosopherEntry[]; updated_at: string }> {
  const res = await fetch(`${_apiUrl}/philosophy-profile/${encodeURIComponent(userId)}/philosophers`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(ctx),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Generate/regenerate book recommendations. Costs 1 use. */
export async function generateBooks(
  userId: string,
  ctx: PhilosophyContext,
): Promise<{ books: BookEntry[]; updated_at: string }> {
  const res = await fetch(`${_apiUrl}/philosophy-profile/${encodeURIComponent(userId)}/books`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(ctx),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Generate/regenerate job/study recommendations. Costs 1 use. */
export async function generateJobs(
  userId: string,
  ctx: PhilosophyContext,
): Promise<{ jobs: JobEntry[]; updated_at: string }> {
  const res = await fetch(`${_apiUrl}/philosophy-profile/${encodeURIComponent(userId)}/jobs`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(ctx),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
