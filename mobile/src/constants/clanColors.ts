import { evoconnColors } from '../theme/colors';
import type { FollowingSortOption } from './followingFeedSort';

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
  nihilista: '#bdb29c',
  cientista: '#529da2',
  estoico: '#818a41',
  existencialista: '#c93a39',
  trascendentalista: '#8d61d1',
  humanista: '#efb318',
  realista: '#a2a3a8',
  racionalista: '#395df2',
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
  nihilista: '#535147',
  cientista: '#fdfef0',
  estoico: '#444827',
  existencialista: '#f9bc4b',
  racionalista: '#46b8f9',
  humanista: '#d08733',
  realista: '#f9a666',
  trascendentalista: '#4e327b',
};

export const CLAN_TERTIARY_COLOR: Record<ClanId, string> = {
  nihilista: '#37343b',
  cientista: '#298280',
  estoico: '#868833',
  existencialista: '#591c2d',
  racionalista: '#defcef',
  humanista: '#2d996a',
  realista: '#696969',
  trascendentalista: '#3f2247',
};

export const NO_CLAN_SECONDARY_COLOR = '#7000ff';
export const NO_CLAN_TERTIARY_COLOR = '#4f59fe';

export function getClanTertiaryColor(clanId: string | null | undefined): string {
  if (!clanId || String(clanId).trim() === '') return NO_CLAN_TERTIARY_COLOR;
  const key = clanId.trim().toLowerCase();
  return (CLAN_TERTIARY_COLOR as Record<string, string>)[key] ?? NO_CLAN_TERTIARY_COLOR;
}

export const CLAN_SECONDARY_DEFAULT = '#7A3CFF';

/** Sin clan / Evocon — verde lima (#c7ff02). */
export const NO_CLAN_ACCENT_COLOR = evoconnColors.neonGreen;

/**
 * Color de superficie sin clan en Para ti / detalle reflexión:
 * - Relleno del SVG `assets/reflectionBackground/noClan.svg` (mismo hex en los `fill`).
 * - Borde izquierdo del panel negro en `ReflectionDetailItem`.
 * Al cambiar el color de prueba, actualiza este valor y los fills del SVG a la vez.
 */
export const NO_CLAN_PARATI_SURFACE_COLOR = '#393939';

/** Alias — mismo valor que `NO_CLAN_PARATI_SURFACE_COLOR` (marco panel en ReflectionDetailItem). */
export const NO_CLAN_COMMUNITY_POST_FRAME_COLOR = NO_CLAN_PARATI_SURFACE_COLOR;

export function getClanSecondaryColor(clanId: string | null | undefined): string {
  if (!clanId || String(clanId).trim() === '') return NO_CLAN_ACCENT_COLOR;
  const key = clanId.trim().toLowerCase();
  return (CLAN_SECONDARY_COLOR as Record<string, string>)[key] ?? NO_CLAN_ACCENT_COLOR;
}

export function getClanColor(clanId: string | null | undefined): string {
  if (clanId == null || String(clanId).trim() === '') return NO_CLAN_ACCENT_COLOR;
  const key = String(clanId).trim().toLowerCase();
  return (CLAN_TO_COLOR as Record<string, string>)[key] ?? NO_CLAN_ACCENT_COLOR;
}

/** Color de la línea de clan en el footer del sidebar: Evocon (`neonGreen`) si aún no hay clan asignado. */
export function getSidebarFooterClanLineColor(clanId: string | null | undefined): string {
  if (clanId == null || String(clanId).trim() === '') {
    return evoconnColors.neonGreen;
  }
  return getClanColor(clanId);
}

/**
 * Color del marco de cada fila del desplegable Siguiendo (mismo criterio que
 * `getFollowingSortDropdownBackgroundSvg`: recientes → principal, votadas_24h → secundario, votadas_mes → terciario).
 * Sin clan: #c7ff02 / #7000ff / #4f59fe como en los SVG `297` / `307` / `317`.
 */
export function getFollowingSortRowBorderColor(
  clanId: string | null | undefined,
  sort: FollowingSortOption,
): string {
  const trimmed = clanId == null ? '' : String(clanId).trim();
  const key = trimmed === '' ? null : trimmed.toLowerCase();
  switch (sort) {
    case 'recientes':
      return getSidebarFooterClanLineColor(clanId);
    case 'votadas_24h':
      if (!key) return NO_CLAN_SECONDARY_COLOR;
      return (CLAN_SECONDARY_COLOR as Record<string, string>)[key] ?? NO_CLAN_SECONDARY_COLOR;
    case 'votadas_mes':
      return getClanTertiaryColor(clanId);
  }
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
  trascendentalista: '#8d61d1',
  cientista: '#529da2',
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

