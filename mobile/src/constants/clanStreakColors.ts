/**
 * Three-tier clan color palette used by the streak display.
 *
 * primary   → Reflexiones calendar active circles
 * secondary → Frases calendar active circles
 * tertiary  → General streak continuous line
 */

export type ClanThreeTierColors = {
  primary: string;
  secondary: string;
  tertiary: string;
};

const CLAN_STREAK_COLORS: Record<string, ClanThreeTierColors> = {
  nihilista:          { primary: '#bdb29c', secondary: '#535147', tertiary: '#37343b' },
  cientista:          { primary: '#529da2', secondary: '#fdfef0', tertiary: '#298280' },
  estoico:            { primary: '#818a41', secondary: '#444827', tertiary: '#868833' },
  existencialista:    { primary: '#c93a39', secondary: '#f9bc4b', tertiary: '#591c2d' },
  racionalista:       { primary: '#395df2', secondary: '#46b8f9', tertiary: '#defcef' },
  humanista:          { primary: '#efb318', secondary: '#d08733', tertiary: '#2d996a' },
  realista:           { primary: '#a2a3a8', secondary: '#f9a666', tertiary: '#696969' },
  trascendentalista:  { primary: '#8d61d1', secondary: '#4e327b', tertiary: '#3f2247' },
  default:            { primary: '#c7ff02', secondary: '#7000ff', tertiary: '#4f59fe' },
};

/** Returns the three-tier color set for a given clan ID, with a safe fallback. */
export function getClanStreakColors(clanId?: string | null): ClanThreeTierColors {
  if (!clanId) return CLAN_STREAK_COLORS.default;
  const key = clanId.trim().toLowerCase();
  return CLAN_STREAK_COLORS[key] ?? CLAN_STREAK_COLORS.default;
}
