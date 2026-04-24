import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

// SVG order (238–246): sinClan, estoico, nihilista, cientista, trascendentalista,
//                      existencialista, humanista, realista, racionalista
import Svg238 from './small/238.svg';
import Svg239 from './small/239.svg';
import Svg240 from './small/240.svg';
import Svg241 from './small/241.svg';
import Svg242 from './small/242.svg';
import Svg243 from './small/243.svg';
import Svg244 from './small/244.svg';
import Svg245 from './small/245.svg';
import Svg246 from './small/246.svg';

const SMALL_CLAN_BG_SVG: Record<ClanId, FC<SvgProps>> = {
  estoico:           Svg239 as FC<SvgProps>,
  nihilista:         Svg240 as FC<SvgProps>,
  cientista:         Svg241 as FC<SvgProps>,
  trascendentalista: Svg242 as FC<SvgProps>,
  existencialista:   Svg243 as FC<SvgProps>,
  humanista:         Svg244 as FC<SvgProps>,
  realista:          Svg245 as FC<SvgProps>,
  racionalista:      Svg246 as FC<SvgProps>,
};

const SIN_CLAN_SMALL_SVG: FC<SvgProps> = Svg238 as FC<SvgProps>;

export function getSmallClanBackgroundSvg(clanId: string | null | undefined): FC<SvgProps> {
  if (!clanId) return SIN_CLAN_SMALL_SVG;
  return (SMALL_CLAN_BG_SVG as Record<string, FC<SvgProps> | undefined>)[clanId] ?? SIN_CLAN_SMALL_SVG;
}
