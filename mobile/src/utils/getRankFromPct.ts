import type { Rank } from '@evoconn/types';

/**
 * Rank thresholds based on dominant clan percentage.
 * ONLY applies to users WITH an assigned clan (clanId !== null).
 *
 *  25–40%  → 'aprendiz'  (clan assigned, first stage)
 *  40–50%  → 'maestro'
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
 *   Aprendiz: 25% → 40%  (15 pt range, start at 25)
 *   Maestro:  40% → 50%  (10 pt range)
 *   Filósofo: always full
 */
export function getRankBarFill(pct: number): number {
  if (pct >= RANK_THRESHOLDS.FILOSOFO) return 1;
  if (pct >= RANK_THRESHOLDS.MAESTRO) {
    return (pct - RANK_THRESHOLDS.MAESTRO) / (RANK_THRESHOLDS.FILOSOFO - RANK_THRESHOLDS.MAESTRO);
  }
  // Aprendiz segment starts at 25 (clan assignment threshold)
  const APRENDIZ_START = 25;
  const aprendizRange = RANK_THRESHOLDS.MAESTRO - APRENDIZ_START;
  const clamped = Math.max(0, pct - APRENDIZ_START);
  return Math.min(1, clamped / aprendizRange);
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

/**
 * Minimum total reflections required to trigger clan assignment reveal.
 * Used to calculate sin-clan progress bar fill.
 */
export const CLAN_REVEAL_MIN_REFLECTIONS = 30;
