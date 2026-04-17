import type { ClanId } from '@evoconn/constants/clanColors';

export const MEDIUM_CLAN_BANNERS: Record<ClanId, number> = {
  racionalista: require('./medium/banners/racionalista.png'),
  realista: require('./medium/banners/realista.png'),
  existencialista: require('./medium/banners/existencialista.png'),
  estoico: require('./medium/banners/estoico.png'),
  humanista: require('./medium/banners/humanista.png'),
  trascendentalista: require('./medium/banners/trascendentalista.png'),
  cientista: require('./medium/banners/cientista.png'),
  nihilista: require('./medium/banners/nihilista.png'),
};

const SIN_CLAN_BANNER: number = require('./sinClan/297.png');

export function getMediumClanBannerAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return SIN_CLAN_BANNER;
  return (MEDIUM_CLAN_BANNERS as Record<string, number | undefined>)[clanId];
}
