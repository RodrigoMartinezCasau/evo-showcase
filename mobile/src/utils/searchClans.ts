import { CLAN_TO_COLOR, type ClanId } from '@evoconn/constants/clanColors';
import { getClanProfile } from '@evoconn/data/mockClanProfiles';

const ACCENT_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u',
  ñ: 'n', ä: 'a', ë: 'e', ï: 'i', ö: 'o',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áéíóúüñäëïö]/g, (ch) => ACCENT_MAP[ch] ?? ch)
    .replace(/^clan\s+/, '')
    .trim();
}

/** Quita plural informal (racionales → racional) para emparejar con el id del clan. */
function stripPlural(text: string): string {
  if (text.endsWith('es') && text.length > 4) return text.slice(0, -2);
  if (text.endsWith('s') && text.length > 3) return text.slice(0, -1);
  return text;
}

export type ScoredClan = {
  id: ClanId;
  name: string;
  score: number;
};

const SEARCHABLE_CLAN_IDS = Object.keys(CLAN_TO_COLOR) as ClanId[];

function clanSearchTerms(clanId: ClanId): string[] {
  const profile = getClanProfile(clanId);
  const terms = new Set<string>([clanId, normalize(clanId)]);
  if (profile) {
    terms.add(normalize(profile.name));
    for (const part of normalize(profile.name).split(/\s+/)) {
      if (part.length > 2) terms.add(part);
    }
    const label = profile.philosophyDistribution.find((p) => p.clanId === clanId)?.label;
    if (label) terms.add(normalize(label));
  }
  return [...terms];
}

function scoreTerm(query: string, term: string): number {
  if (term === query) return 100;
  if (term.startsWith(query)) return 85 - term.length * 0.05;
  if (query.startsWith(term) && term.length >= 4) return 75;
  if (term.includes(query)) return 65 - term.indexOf(query) * 0.3;
  if (query.includes(term) && term.length >= 4) return 55;
  const qStem = stripPlural(query);
  const tStem = stripPlural(term);
  if (qStem.length >= 4 && (tStem.startsWith(qStem) || qStem.startsWith(tStem))) return 70;
  return 0;
}

/**
 * Busca clanes por id, nombre visible o etiqueta (p. ej. "racionales" → Racionalista).
 */
export function searchClans(query: string): ScoredClan[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: ScoredClan[] = [];
  for (const clanId of SEARCHABLE_CLAN_IDS) {
    const profile = getClanProfile(clanId);
    if (!profile) continue;

    let best = 0;
    for (const term of clanSearchTerms(clanId)) {
      best = Math.max(best, scoreTerm(q, term));
    }
    if (best > 0) {
      results.push({ id: clanId, name: profile.name, score: best });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
