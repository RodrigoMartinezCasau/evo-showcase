import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

export type BottomBarLupitaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

import Svg66 from '../assets/bottomBar/lupitas/66.svg';
import Svg67 from '../assets/bottomBar/lupitas/67.svg';
import Svg68 from '../assets/bottomBar/lupitas/68.svg';
import Svg69 from '../assets/bottomBar/lupitas/69.svg';
import Svg70 from '../assets/bottomBar/lupitas/70.svg';
import Svg71 from '../assets/bottomBar/lupitas/71.svg';
import Svg72 from '../assets/bottomBar/lupitas/72.svg';
import Svg73 from '../assets/bottomBar/lupitas/73.svg';
import Svg74 from '../assets/bottomBar/lupitas/74.svg';
import Svg75 from '../assets/bottomBar/lupitas/75.svg';
/**
 * Lupa barra inferior: 66 = inactiva (gris); 67 = tab búsqueda activa sin clan (Evocon);
 * 68–75 = racionalista…estoico (mismo orden que botón clan / insignia).
 */
const LUPITA_BY_CLAN: Record<ClanId, FC<BottomBarLupitaSvgProps>> = {
  racionalista: Svg68,
  realista: Svg69,
  humanista: Svg70,
  existencialista: Svg71,
  trascendentalista: Svg72,
  cientista: Svg73,
  nihilista: Svg74,
  estoico: Svg75,
};

export const BOTTOM_BAR_DEFAULT_LUPITA: FC<BottomBarLupitaSvgProps> = Svg66;

export function getBottomBarLupitaByHouse(house?: string | null): FC<BottomBarLupitaSvgProps> {
  if (house == null || String(house).trim() === '') {
    return Svg67;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (LUPITA_BY_CLAN as Record<string, FC<BottomBarLupitaSvgProps> | undefined>)[key] ??
    BOTTOM_BAR_DEFAULT_LUPITA
  );
}
