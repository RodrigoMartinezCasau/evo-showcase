/**
 * Hero summary row (icon + text) inside gray bordered cards:
 * StreakScreen, DailyUsesScreen, PhrasesDomainsScreen.
 *
 * The icon lives in a fixed square slot; visual scale is capped so the SVG
 * never clips outside the slot. The whole row is centered in the card (X+Y).
 */

import { STREAK_COUNT_FONT_SIZE } from './streakLayout';

/** Gap between icon slot and text column. */
export const HERO_SUMMARY_ROW_GAP = 12;

/** Min / max icon slot (px) — scales with screen width between these bounds. */
export const HERO_ICON_SLOT_MIN = 56;
export const HERO_ICON_SLOT_MAX = 88;

/**
 * Square slot side for the hero icon, derived from screen width so small phones
 * don't overflow the card.
 */
export function heroIconSlotSize(screenWidth: number): number {
  const raw = Math.round(screenWidth * 0.19);
  return Math.max(HERO_ICON_SLOT_MIN, Math.min(HERO_ICON_SLOT_MAX, raw));
}

/**
 * Visual scale for SVG drawn at `baseSize` so it fits inside `slot` (layout box).
 * `maxScale` is the desired aesthetic cap from streakLayout / phrases constants.
 */
export function heroIconVisualScale(baseSize: number, slot: number, maxScale: number): number {
  if (baseSize <= 0 || slot <= 0) return 1;
  const fit = slot / baseSize;
  return Math.min(maxScale, Math.max(0.75, fit));
}

/** Base SVG width/height for streak + uses hero (matches large number). */
export const HERO_STREAK_BASE_ICON_SIZE = STREAK_COUNT_FONT_SIZE;
