/**
 * DebugClanContext
 *
 * Thin wrapper that makes clan-switching delegate to SimulationContext so that
 * selecting a clan = switching to the full simulated user for that clan.
 *
 * All existing hooks (useActiveClan, useDebugClan, useDebugClanSetter) continue
 * to work with the same signature — no call-site changes needed.
 */
import React, { useCallback, type ReactNode } from 'react';
import type { ClanId } from '@evoconn/constants/clanColors';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { CLAN_TO_USER_ID } from '@evoconn/data/simulation/simulatedNetwork';

// ─── Provider (kept as a transparent pass-through for backward compat) ────────

export function DebugClanProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the active simulated user's clanId.
 * The `realClan` parameter is accepted for backward compat but is superseded
 * by the simulation whenever SimulationContext is available.
 */
export function useActiveClan(realClan: string | null): string | null {
  const sim = useSimulation();
  return sim.activeUser.clanId;
}

/**
 * Returns the active simulated user's clanId cast to `ClanId | null`.
 */
export function useDebugClan(): ClanId | null {
  const sim = useSimulation();
  return (sim.activeUser.clanId as ClanId) ?? null;
}

/**
 * Returns a stable setter that maps a `ClanId | null` to the corresponding
 * simulated user and calls `setActiveUserId`.
 */
export function useDebugClanSetter() {
  const sim = useSimulation();
  return useCallback(
    (clanId: ClanId | null) => {
      const key = clanId ?? '__sinclan__';
      const userId = CLAN_TO_USER_ID[key] ?? 'u1';
      sim.setActiveUserId(userId);
    },
    [sim],
  );
}
