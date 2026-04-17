import type { ClanId } from '@evoconn/constants/clanColors';

export const SMALL_CLAN_BACKGROUNDS: Record<ClanId, number> = {
  humanista: require('./small/humanista.png'),
  racionalista: require('./small/racionalista.png'),
  cientista: require('./small/cientista.png'),
  estoico: require('./small/estoico.png'),
  existencialista: require('./small/existencialista.png'),
  trascendentalista: require('./small/trascendentalista.png'),
  nihilista: require('./small/nihilista.png'),
  realista: require('./small/realista.png'),
};

const SIN_CLAN_SMALL_BG: number = require('./sinClan/243.png');

export function getSmallClanBackgroundAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return SIN_CLAN_SMALL_BG;
  return (SMALL_CLAN_BACKGROUNDS as Record<string, number | undefined>)[clanId];
}
