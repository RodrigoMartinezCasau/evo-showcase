import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

// SVG order (247–255): sinClan, estoico, nihilista, cientista, trascendentalista,
//                      existencialista, humanista, realista, racionalista
import Svg247 from './quote/247.svg';
import Svg248 from './quote/248.svg';
import Svg249 from './quote/249.svg';
import Svg250 from './quote/250.svg';
import Svg251 from './quote/251.svg';
import Svg252 from './quote/252.svg';
import Svg253 from './quote/253.svg';
import Svg254 from './quote/254.svg';
import Svg255 from './quote/255.svg';

const QUOTE_CLAN_BG_SVG: Record<ClanId, FC<SvgProps>> = {
  estoico:           Svg248 as FC<SvgProps>,
  nihilista:         Svg249 as FC<SvgProps>,
  cientista:         Svg250 as FC<SvgProps>,
  trascendentalista: Svg251 as FC<SvgProps>,
  existencialista:   Svg252 as FC<SvgProps>,
  humanista:         Svg253 as FC<SvgProps>,
  realista:          Svg254 as FC<SvgProps>,
  racionalista:      Svg255 as FC<SvgProps>,
};

const SIN_CLAN_QUOTE_SVG: FC<SvgProps> = Svg247 as FC<SvgProps>;

export function getQuoteClanBackgroundSvg(clanId: string | null | undefined): FC<SvgProps> {
  if (!clanId) return SIN_CLAN_QUOTE_SVG;
  return (QUOTE_CLAN_BG_SVG as Record<string, FC<SvgProps> | undefined>)[clanId] ?? SIN_CLAN_QUOTE_SVG;
}
