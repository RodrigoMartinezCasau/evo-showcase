import type { ClanId } from '@evoconn/constants/clanColors';

export const SMALL_CLAN_BANNERS: Record<ClanId, number> = {
  racionalista: require('./small/banners/racionalista.png'),
  realista: require('./small/banners/realista.png'),
  existencialista: require('./small/banners/existencialista.png'),
  estoico: require('./small/banners/estoico.png'),
  humanista: require('./small/banners/humanista.png'),
  trascendentalista: require('./small/banners/trascendentalista.png'),
  cientista: require('./small/banners/cientista.png'),
  nihilista: require('./small/banners/nihilista.png'),
};

const SIN_CLAN_BANNER: number = require('./sinClan/297.png');

export function getSmallClanBannerAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return SIN_CLAN_BANNER;
  return (SMALL_CLAN_BANNERS as Record<string, number | undefined>)[clanId];
}

