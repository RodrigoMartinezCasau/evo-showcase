import type { ClanId } from '@evoconn/constants/clanColors';

/** Payload for the streak home-screen widget (Android). */
export type StreakWidgetPayload = {
  kind: 'streak';
  streakDays: number;
  /** True when the user extended the streak today (same as `hasSentToday` in stats). */
  hasSentToday: boolean;
  /** Visible clan id, or null / empty for sin clan. */
  clanId: ClanId | null;
};

export function buildStreakWidgetPayload(input: {
  streakDays: number;
  hasSentToday: boolean;
  clanId: string | null | undefined;
}): StreakWidgetPayload {
  const raw = input.clanId?.trim().toLowerCase() ?? '';
  const clanId =
    raw.length > 0 && isClanId(raw) ? (raw as ClanId) : null;
  return {
    kind: 'streak',
    streakDays: Math.max(0, Math.floor(input.streakDays)),
    hasSentToday: input.hasSentToday,
    clanId,
  };
}

const CLAN_IDS: readonly ClanId[] = [
  'racionalista',
  'realista',
  'humanista',
  'existencialista',
  'trascendentalista',
  'cientista',
  'nihilista',
  'estoico',
];

function isClanId(value: string): value is ClanId {
  return (CLAN_IDS as readonly string[]).includes(value);
}
