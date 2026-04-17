/**
 * Editable config for the user message accent bar in the chat/thought screen.
 *
 * accentWidth  — thickness of the left-side bar (px).
 * accentColors — per-clan color for the accent bar.
 *                "noClan" is used when the user has no clan assigned.
 */

export const CHAT_USER_MESSAGE_LAYOUT = {
  accentWidth: 4,
  accentColors: {
    noClan: '#c7ff02',

    nihilista: '#bdb29c',
    racionalista: '#395df2',
    estoico: '#818a41',
    humanista: '#efb318',
    existencialista: '#c93a39',
    trascendentalista: '#cb6ce6',
    cientista: '#54d5cf',
    realista: '#a2a3a8',
  },
} as const;

/** Resolve the accent color for a given clan ID. */
export function getChatUserAccentColor(clanId: string | null | undefined): string {
  if (!clanId || String(clanId).trim() === '') {
    return CHAT_USER_MESSAGE_LAYOUT.accentColors.noClan;
  }
  const key = clanId.trim().toLowerCase();
  return (
    (CHAT_USER_MESSAGE_LAYOUT.accentColors as Record<string, string>)[key] ??
    CHAT_USER_MESSAGE_LAYOUT.accentColors.noClan
  );
}
