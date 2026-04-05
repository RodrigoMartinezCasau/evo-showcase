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
    noClan: '#C7FF1A',

    nihilista: '#D8D2C4',
    racionalista: '#4D7DFF',
    estoico: '#8A9250',
    humanista: '#E0B646',
    existencialista: '#D6524A',
    trascendentalista: '#B979FF',
    cientista: '#7EE7E7',
    realista: '#F3E8D2',
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
