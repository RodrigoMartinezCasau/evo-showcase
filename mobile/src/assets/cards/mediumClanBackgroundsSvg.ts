import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

// SVG order (229–237): sinClan, estoico, nihilista, cientista, trascendentalista,
//                      existencialista, humanista, realista, racionalista
import Svg229 from './medium/229.svg';
import Svg230 from './medium/230.svg';
import Svg231 from './medium/231.svg';
import Svg232 from './medium/232.svg';
import Svg233 from './medium/233.svg';
import Svg234 from './medium/234.svg';
import Svg235 from './medium/235.svg';
import Svg236 from './medium/236.svg';
import Svg237 from './medium/237.svg';

const MEDIUM_CLAN_BG_SVG: Record<ClanId, FC<SvgProps>> = {
  estoico:           Svg230 as FC<SvgProps>,
  nihilista:         Svg231 as FC<SvgProps>,
  cientista:         Svg232 as FC<SvgProps>,
  trascendentalista: Svg233 as FC<SvgProps>,
  existencialista:   Svg234 as FC<SvgProps>,
  humanista:         Svg235 as FC<SvgProps>,
  realista:          Svg236 as FC<SvgProps>,
  racionalista:      Svg237 as FC<SvgProps>,
};

const SIN_CLAN_MEDIUM_SVG: FC<SvgProps> = Svg229 as FC<SvgProps>;

export function getMediumClanBackgroundSvg(clanId: string | null | undefined): FC<SvgProps> {
  if (!clanId) return SIN_CLAN_MEDIUM_SVG;
  return (MEDIUM_CLAN_BG_SVG as Record<string, FC<SvgProps> | undefined>)[clanId] ?? SIN_CLAN_MEDIUM_SVG;
}
