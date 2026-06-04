import type { Rank } from '@evoconn/types';

/**
 * Rank thresholds based on dominant clan percentage.
 * ONLY applies to users WITH an assigned clan (clanId !== null).
 *
 *  < 40%   → 'aprendiz'
 *  40–49%  → 'maestro'
 *  ≥ 50%   → 'filosofo'
 *
 * Users without a clan (clanId === null) are always 'aprendiz'.
 * Use getRankForUser() to get the correct rank including clanId check.
 */
export const RANK_THRESHOLDS = {
  MAESTRO:   40,  // pct >= this → Maestro
  FILOSOFO:  50,  // pct >= this → Filósofo
} as const;

export function getRankFromPct(pct: number): Rank {
  if (pct >= RANK_THRESHOLDS.FILOSOFO) return 'filosofo';
  if (pct >= RANK_THRESHOLDS.MAESTRO)  return 'maestro';
  return 'aprendiz';
}

/**
 * Progress fraction (0–1) within the current rank's segment for the bar.
 * Mide cuánto falta para el **siguiente** rango (no usa el 25 % de asignación de clan).
 *   Aprendiz: 0% → 40%  (p. ej. 24 % → 60 % de barra)
 *   Maestro:  40% → 50%
 *   Filósofo: barra llena
 */
export function getRankBarFill(pct: number): number {
  const clampedPct = Math.max(0, pct);
  if (clampedPct >= RANK_THRESHOLDS.FILOSOFO) return 1;
  if (clampedPct >= RANK_THRESHOLDS.MAESTRO) {
    return (
      (clampedPct - RANK_THRESHOLDS.MAESTRO) /
      (RANK_THRESHOLDS.FILOSOFO - RANK_THRESHOLDS.MAESTRO)
    );
  }
  return Math.min(1, clampedPct / RANK_THRESHOLDS.MAESTRO);
}

/** Threshold percentage where the current rank ends (= next rank starts). */
export function getNextRankThreshold(pct: number): number | null {
  if (pct >= RANK_THRESHOLDS.FILOSOFO) return null;
  if (pct >= RANK_THRESHOLDS.MAESTRO)  return RANK_THRESHOLDS.FILOSOFO;
  return RANK_THRESHOLDS.MAESTRO;
}

/**
 * Returns the correct rank considering clan assignment.
 * Users with no clan (clanId === null) are always 'aprendiz',
 * regardless of their philosophy percentages.
 */
export function getRankForUser(pct: number, clanId: string | null): Rank {
  if (clanId === null) return 'aprendiz';
  return getRankFromPct(pct);
}

export type ClanPctLike = { clanId: string; pct: number; label?: string };

/** % del clan visible dentro de `philosophyPercentages` / `clan_percentages`. */
export function getDominantClanPct(
  percentages: ReadonlyArray<ClanPctLike>,
  clanId: string | null | undefined,
): number {
  if (clanId == null) return 0;
  const key = String(clanId).trim().toLowerCase();
  if (!key) return 0;
  const hit = percentages.find(
    (e) => String(e.clanId).trim().toLowerCase() === key,
  );
  return hit?.pct ?? 0;
}

/** Etiqueta + % del clan visible (para DetailedRankCard y contexto IA). */
export function getVisibleClanPctEntry(
  percentages: ReadonlyArray<ClanPctLike>,
  clanId: string | null | undefined,
): { label: string; pct: number } {
  const pct = getDominantClanPct(percentages, clanId);
  if (clanId == null) return { label: '', pct: 0 };
  const key = String(clanId).trim().toLowerCase();
  const hit = percentages.find(
    (e) => String(e.clanId).trim().toLowerCase() === key,
  );
  return { label: hit?.label ?? '', pct };
}

/**
 * Rango mostrado en perfil según umbrales (40 / 50) y % del clan asignado.
 * Si no hay porcentajes, usa `fallback`.
 */
export function getProfileRankFromPercentages(
  clanId: string | null | undefined,
  percentages: ReadonlyArray<ClanPctLike>,
  fallback: Rank = 'aprendiz',
): Rank {
  if (!percentages.length) return fallback;
  return getRankForUser(getDominantClanPct(percentages, clanId), clanId ?? null);
}

/** Progreso 0–1 de la barra de rango en perfil (misma lógica que DetailedRankCard). */
export function getProfileRankBarProgress(
  clanId: string | null | undefined,
  percentages: ReadonlyArray<ClanPctLike>,
): number {
  if (clanId == null) return 0;
  return getRankBarFill(getDominantClanPct(percentages, clanId));
}

/**
 * Minimum total inputs (reflections + phrases) to trigger clan assignment reveal.
 * Used to calculate sin-clan progress bar fill.
 * Keep in sync with REVEAL_TOTAL_INPUTS_THRESHOLD in ClassificationContext.
 */
export const CLAN_REVEAL_MIN_INPUTS = 8;
/** @deprecated Use CLAN_REVEAL_MIN_INPUTS */
export const CLAN_REVEAL_MIN_REFLECTIONS = CLAN_REVEAL_MIN_INPUTS;
