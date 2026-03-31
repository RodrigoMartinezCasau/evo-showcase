import type { User } from '../types';

const ACCENT_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u',
  ñ: 'n', ä: 'a', ë: 'e', ï: 'i', ö: 'o',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áéíóúüñäëïö]/g, (ch) => ACCENT_MAP[ch] ?? ch)
    .replace(/^@/, '');
}

export type ScoredUser = User & { score: number };

/**
 * Searches users by username with prefix > partial > fuzzy ranking.
 * Returns sorted results (best match first).
 */
export function searchUsers(query: string, users: readonly User[]): ScoredUser[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: ScoredUser[] = [];

  for (const user of users) {
    const name = normalize(user.username);
    let score = 0;

    if (name === q) {
      score = 100;
    } else if (name.startsWith(q)) {
      score = 80 - name.length * 0.1;
    } else if (name.includes(q)) {
      const pos = name.indexOf(q);
      score = 60 - pos * 0.5;
    } else {
      continue;
    }

    const followers = user.followersCount ?? 0;
    score += Math.min(10, Math.log10(followers + 1) * 2.5);

    results.push({ ...user, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
