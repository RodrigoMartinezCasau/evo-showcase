import type { ClanId } from '@evoconn/constants/clanColors';

export const QUOTE_CLAN_BACKGROUNDS: Record<ClanId, number> = {
  racionalista: require('./quote/racionalista.png'),
  realista: require('./quote/realista.png'),
  existencialista: require('./quote/existencialista.png'),
  estoico: require('./quote/estoico.png'),
  humanista: require('./quote/humanista.png'),
  trascendentalista: require('./quote/trascendentalista.png'),
  cientista: require('./quote/cientista.png'),
  nihilista: require('./quote/nihilista.png'),
};

const SIN_CLAN_QUOTE_BG: number = require('./sinClan/252.png');

export function getQuoteClanBackgroundAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return SIN_CLAN_QUOTE_BG;
  return (QUOTE_CLAN_BACKGROUNDS as Record<string, number | undefined>)[clanId];
}
