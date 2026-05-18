import { ALL_CLAN_IDS } from '@evoconn/services/clanClassifier';

const PHILOSOPHIC_CLAN_IDS = new Set<string>(ALL_CLAN_IDS);

/** Autor en uno de los 8 clanes filosóficos (no sin clan). */
export function authorHasPhilosophicClan(clanId: string | null | undefined): boolean {
  if (clanId == null) return false;
  const key = String(clanId).trim().toLowerCase();
  return key !== '' && PHILOSOPHIC_CLAN_IDS.has(key);
}

/**
 * Multiplicador Para ti por clan del autor.
 * Los 8 clanes comparten el mismo bonus; sin clan queda por debajo.
 */
export function getParatiAuthorClanMembershipMultiplier(
  authorClanId: string | null | undefined,
): number {
  return authorHasPhilosophicClan(authorClanId) ? 1.25 : 0.7;
}
