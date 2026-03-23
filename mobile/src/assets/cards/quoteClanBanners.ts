import type { ClanId } from '@evoconn/constants/clanColors';

export const QUOTE_CLAN_BANNERS: Record<ClanId, number> = {
  racionalista: require('./small/banners/racionalista.png'),
  realista: require('./small/banners/realista.png'),
  existencialista: require('./small/banners/existencialista.png'),
  estoico: require('./small/banners/estoico.png'),
  humanista: require('./small/banners/humanista.png'),
  trascendentalista: require('./small/banners/trascendentalista.png'),
  cientista: require('./small/banners/cientista.png'),
  nihilista: require('./small/banners/nihilista.png'),
};

export function getQuoteClanBannerAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return undefined;
  return (QUOTE_CLAN_BANNERS as Record<string, number | undefined>)[clanId];
}
