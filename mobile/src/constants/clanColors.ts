import { evoconnColors } from '../theme/colors';

export type ClanId =
  | 'nihilista'
  | 'cientista'
  | 'estoico'
  | 'existencialista'
  | 'trascendentalista'
  | 'humanista'
  | 'realista'
  | 'racionalista';

export const CLAN_TO_COLOR: Record<ClanId, string> = {
  /** Acento legible sobre fondo oscuro (mismo token que `evoconnColors.accent` / cards nihilista). */
  nihilista: evoconnColors.accent,
  cientista: '#50D6D3',
  // Estoicos = olive green (not gray)
  estoico: '#7B8342',
  existencialista: '#C93A3A',
  trascendentalista: '#C56BEA',
  humanista: '#FFC400',
  realista: '#A7AAB0',
  racionalista: '#3F63FF',
};

export const CLAN_TO_BG_ASSET: Partial<Record<ClanId, number>> = {
  cientista: require('../assets/cards/clans/cyan.png'),
  estoico: require('../assets/cards/clans/olive.png'),
  existencialista: require('../assets/cards/clans/red.png'),
  trascendentalista: require('../assets/cards/clans/purple.png'),
  humanista: require('../assets/cards/clans/yellow.png'),
  realista: require('../assets/cards/clans/gray.png'),
  racionalista: require('../assets/cards/clans/blue.png'),
  // nihilista: no asset provided; use near-black solid
};

/**
 * Secondary / softer clan tint used for follow-button borders and similar accents.
 * Default (no clan / Evoconn) uses the Evoconn purple.
 */
export const CLAN_SECONDARY_COLOR: Record<ClanId, string> = {
  nihilista: '#6E6A63',
  racionalista: '#7DB7FF',
  estoico: '#D9C27A',
  humanista: '#B97A2B',
  existencialista: '#C96A4A',
  trascendentalista: '#D8CF72',
  cientista: '#DFF7F7',
  realista: '#E37B6F',
};

export const CLAN_SECONDARY_DEFAULT = '#7A3CFF';

export function getClanSecondaryColor(clanId: string | null | undefined): string {
  if (!clanId || String(clanId).trim() === '') return CLAN_SECONDARY_DEFAULT;
  const key = clanId.trim().toLowerCase();
  return (CLAN_SECONDARY_COLOR as Record<string, string>)[key] ?? CLAN_SECONDARY_DEFAULT;
}

export function getClanColor(clanId: string | null | undefined): string {
  if (!clanId) return CLAN_TO_COLOR.nihilista;
  return (CLAN_TO_COLOR as Record<string, string>)[clanId] ?? CLAN_TO_COLOR.nihilista;
}

/** Color de la línea de clan en el footer del sidebar: Evocon (`neonGreen`) si aún no hay clan asignado. */
export function getSidebarFooterClanLineColor(clanId: string | null | undefined): string {
  if (clanId == null || String(clanId).trim() === '') {
    return evoconnColors.neonGreen;
  }
  return getClanColor(clanId);
}

export function getClanBgAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return undefined;
  return (CLAN_TO_BG_ASSET as Record<string, number | undefined>)[clanId];
}

/**
 * Tinte del icono de estrellas en la barra superior (mapping explícito; no deriva de `CLAN_TO_COLOR`).
 */
export const CLAN_TO_TOP_BAR_STAR_COLOR: Record<ClanId, string> = {
  nihilista: '#D6CBB3',
  racionalista: '#4A6CFF',
  estoico: '#8A9A5B',
  humanista: '#F2C94C',
  existencialista: '#E74C3C',
  trascendentalista: '#A66DD4',
  cientista: '#4FD1C5',
  realista: '#B0B0B0',
};

/** Sin clan / Evocon — mismo verde lima que `evoconnColors.neonGreen`. */
export const TOP_BAR_STAR_DEFAULT_COLOR = evoconnColors.neonGreen;

export function getTopBarStarColor(clanId: string | null | undefined): string {
  if (clanId == null || String(clanId).trim() === '') {
    return TOP_BAR_STAR_DEFAULT_COLOR;
  }
  const key = clanId.trim().toLowerCase();
  return (CLAN_TO_TOP_BAR_STAR_COLOR as Record<string, string>)[key] ?? TOP_BAR_STAR_DEFAULT_COLOR;
}

// Debug: expose mapping once in Metro logs so you can verify.
const anyGlobal = globalThis as unknown as Record<string, unknown>;
if (!anyGlobal.__EVOCONN_CLAN_COLOR_DEBUG_PRINTED__) {
  anyGlobal.__EVOCONN_CLAN_COLOR_DEBUG_PRINTED__ = true;
  // eslint-disable-next-line no-console
  console.log('[EVOCONN] CLAN_TO_COLOR', CLAN_TO_COLOR);
  // eslint-disable-next-line no-console
  console.log('[EVOCONN] CLAN_TO_BG_ASSET keys', Object.keys(CLAN_TO_BG_ASSET));
}

