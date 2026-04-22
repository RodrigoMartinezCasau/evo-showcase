/**
 * DebugClanContext
 *
 * Thin wrapper that makes clan-switching delegate to SimulationContext so that
 * selecting a clan = switching to the full simulated user for that clan.
 *
 * Visible clan resolution:
 *   The seed `simUser.clanId` from `simulatedNetwork.ts` is no longer the
 *   source of truth. Per the philosophical-classification spec, every user
 *   must start visibly as "Sin clan" and only get a clan revealed once the
 *   real classification engine (ClassificationContext) decides so.
 *
 *   `useActiveClan` therefore now reads from ClassificationContext first
 *   and falls back to the simulation seed only if ClassificationContext
 *   is unavailable (defensive — should always be available in this tree).
 *
 * All existing hooks (useActiveClan, useDebugClan, useDebugClanSetter) continue
 * to work with the same signature — no call-site changes needed.
 */
import React, { useCallback, type ReactNode } from 'react';
import type { ClanId } from '@evoconn/constants/clanColors';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { CLAN_TO_USER_ID } from '@evoconn/data/simulation/simulatedNetwork';

// ─── Provider (kept as a transparent pass-through for backward compat) ────────

export function DebugClanProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the visible clanId for the active simulated user.
 *
 * Source of truth = ClassificationContext (real per-user clan engine).
 * Returns `null` ("Sin clan") until the user has both ≥ 30 reflections
 * and a clan above 30%.
 *
 * The `realClan` parameter is accepted for backward compat but is
 * superseded by the classification result.
 */
export function useActiveClan(_realClan: string | null): string | null {
  const sim = useSimulation();
  const classification = useClassification();
  const { isPreviewActive, previewClanId } = usePreviewMode();
  if (isPreviewActive) return previewClanId;
  return classification.getVisibleClanId(sim.activeUserId);
}

/**
 * Returns the active simulated user's visible clanId cast to `ClanId | null`.
 * Reflects the real classification state — null until reveal conditions met.
 */
export function useDebugClan(): ClanId | null {
  const sim = useSimulation();
  const classification = useClassification();
  const { isPreviewActive, previewClanId } = usePreviewMode();
  if (isPreviewActive) return previewClanId as ClanId ?? null;
  return (classification.getVisibleClanId(sim.activeUserId) as ClanId) ?? null;
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
