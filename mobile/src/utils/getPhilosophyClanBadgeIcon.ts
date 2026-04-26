import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ClanId } from '@evoconn/constants/clanColors';
import type { Rank } from '@evoconn/types';

import HiddenBadge from '../assets/philosophyBadges/hidden/badgeOculto.svg';

import BaseRacionalista from '../assets/philosophyBadges/base/52.svg';
import BaseRealista from '../assets/philosophyBadges/base/53.svg';
import BaseHumanista from '../assets/philosophyBadges/base/54.svg';
import BaseExistencialista from '../assets/philosophyBadges/base/55.svg';
import BaseTrascendentalista from '../assets/philosophyBadges/base/56.svg';
import BaseCientista from '../assets/philosophyBadges/base/57.svg';
import BaseNihilista from '../assets/philosophyBadges/base/58.svg';
import BaseEstoico from '../assets/philosophyBadges/base/59.svg';

import MasterRacionalista from '../assets/philosophyBadges/master/70.svg';
import MasterRealista from '../assets/philosophyBadges/master/71.svg';
import MasterHumanista from '../assets/philosophyBadges/master/72.svg';
import MasterExistencialista from '../assets/philosophyBadges/master/73.svg';
import MasterTrascendentalista from '../assets/philosophyBadges/master/74.svg';
import MasterCientista from '../assets/philosophyBadges/master/75.svg';
import MasterNihilista from '../assets/philosophyBadges/master/76.svg';
import MasterEstoico from '../assets/philosophyBadges/master/77.svg';

import PhilosopherRacionalista from '../assets/philosophyBadges/philosopher/61.svg';
import PhilosopherRealista from '../assets/philosophyBadges/philosopher/62.svg';
import PhilosopherHumanista from '../assets/philosophyBadges/philosopher/63.svg';
import PhilosopherExistencialista from '../assets/philosophyBadges/philosopher/64.svg';
import PhilosopherTrascendentalista from '../assets/philosophyBadges/philosopher/65.svg';
import PhilosopherCientista from '../assets/philosophyBadges/philosopher/66.svg';
import PhilosopherNihilista from '../assets/philosophyBadges/philosopher/67.svg';
import PhilosopherEstoico from '../assets/philosophyBadges/philosopher/68.svg';

export type PhilosophyClanBadgeSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const BASE_BADGE_BY_CLAN: Record<ClanId, FC<PhilosophyClanBadgeSvgProps>> = {
  racionalista: BaseRacionalista,
  realista: BaseRealista,
  humanista: BaseHumanista,
  existencialista: BaseExistencialista,
  trascendentalista: BaseTrascendentalista,
  cientista: BaseCientista,
  nihilista: BaseNihilista,
  estoico: BaseEstoico,
};

const MASTER_BADGE_BY_CLAN: Record<ClanId, FC<PhilosophyClanBadgeSvgProps>> = {
  racionalista: MasterRacionalista,
  realista: MasterRealista,
  humanista: MasterHumanista,
  existencialista: MasterExistencialista,
  trascendentalista: MasterTrascendentalista,
  cientista: MasterCientista,
  nihilista: MasterNihilista,
  estoico: MasterEstoico,
};

const PHILOSOPHER_BADGE_BY_CLAN: Record<ClanId, FC<PhilosophyClanBadgeSvgProps>> = {
  racionalista: PhilosopherRacionalista,
  realista: PhilosopherRealista,
  humanista: PhilosopherHumanista,
  existencialista: PhilosopherExistencialista,
  trascendentalista: PhilosopherTrascendentalista,
  cientista: PhilosopherCientista,
  nihilista: PhilosopherNihilista,
  estoico: PhilosopherEstoico,
};

export const HIDDEN_PHILOSOPHY_CLAN_BADGE: FC<PhilosophyClanBadgeSvgProps> = HiddenBadge;

export function getPhilosophyClanBadgeIcon(
  clanId: ClanId,
  highestRank?: Rank | null,
): FC<PhilosophyClanBadgeSvgProps> {
  if (!highestRank) return HIDDEN_PHILOSOPHY_CLAN_BADGE;
  if (highestRank === 'filosofo') return PHILOSOPHER_BADGE_BY_CLAN[clanId];
  if (highestRank === 'maestro') return MASTER_BADGE_BY_CLAN[clanId];
  return BASE_BADGE_BY_CLAN[clanId];
}
