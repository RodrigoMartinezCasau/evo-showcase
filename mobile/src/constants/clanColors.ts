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
  nihilista: '#0E0E12',
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

// Debug: expose mapping once in Metro logs so you can verify.
const anyGlobal = globalThis as unknown as Record<string, unknown>;
if (!anyGlobal.__EVOCONN_CLAN_COLOR_DEBUG_PRINTED__) {
  anyGlobal.__EVOCONN_CLAN_COLOR_DEBUG_PRINTED__ = true;
  // eslint-disable-next-line no-console
  console.log('[EVOCONN] CLAN_TO_COLOR', CLAN_TO_COLOR);
  // eslint-disable-next-line no-console
  console.log('[EVOCONN] CLAN_TO_BG_ASSET keys', Object.keys(CLAN_TO_BG_ASSET));
}

