import type { ClanId } from '@evoconn/constants/clanColors';

export const MEDIUM_CLAN_BACKGROUNDS: Record<ClanId, number> = {
  humanista: require('./medium/humanista.png'),
  racionalista: require('./medium/racionalista.png'),
  cientista: require('./medium/cientista.png'),
  estoico: require('./medium/estoico.png'),
  existencialista: require('./medium/existencialista.png'),
  trascendentalista: require('./medium/trascendentalista.png'),
  nihilista: require('./medium/nihilista.png'),
  realista: require('./medium/realista.png'),
};

export function getMediumClanBackgroundAsset(clanId: string | null | undefined): number | undefined {
  if (!clanId) return undefined;
  return (MEDIUM_CLAN_BACKGROUNDS as Record<string, number | undefined>)[clanId];
}
