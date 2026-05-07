import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import BarDefault from '../assets/sidebar/conversationBars/bar-default.svg';
import BarNihilista from '../assets/sidebar/conversationBars/bar-nihilista.svg';
import BarCientista from '../assets/sidebar/conversationBars/bar-cientista.svg';
import BarEstoico from '../assets/sidebar/conversationBars/bar-estoico.svg';
import BarExistencialista from '../assets/sidebar/conversationBars/bar-existencialista.svg';
import BarTrascendentalista from '../assets/sidebar/conversationBars/bar-trascendentalista.svg';
import BarHumanista from '../assets/sidebar/conversationBars/bar-humanista.svg';
import BarRealista from '../assets/sidebar/conversationBars/bar-realista.svg';
import BarRacionalista from '../assets/sidebar/conversationBars/bar-racionalista.svg';

export type SidebarConversationsBarSvgProps = {
  width?: number | string;
  height?: number | string;
  /** Sustituye el viewBox erróneo incrustado en los .svg (600×600). */
  viewBox?: string;
  style?: StyleProp<ViewStyle>;
  preserveAspectRatio?: string;
};

/**
 * Barras de conversaciones por clan (SVG en `conversationBars/`).
 *
 * Nota: `SidebarConversationsPanel` usa hoy un marco `View` + `getClanColor` porque
 * estos SVG exportan clipPaths que a menudo no se pintan bien en react-native-svg.
 * Mantener imports por si en el futuro se sustituye el marco por PNG/SVG simplificado.
 */
const BAR_SVG_BY_CLAN: Record<ClanId, FC<SidebarConversationsBarSvgProps>> = {
  nihilista: BarNihilista,
  cientista: BarCientista,
  estoico: BarEstoico,
  existencialista: BarExistencialista,
  trascendentalista: BarTrascendentalista,
  humanista: BarHumanista,
  realista: BarRealista,
  racionalista: BarRacionalista,
};

export const SIDEBAR_DEFAULT_CONVERSATIONS_BAR_SVG: FC<SidebarConversationsBarSvgProps> = BarDefault;

export function getSidebarConversationsBarSvgByHouse(
  house?: string | null
): FC<SidebarConversationsBarSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_CONVERSATIONS_BAR_SVG;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (BAR_SVG_BY_CLAN as Record<string, FC<SidebarConversationsBarSvgProps> | undefined>)[key]
    ?? SIDEBAR_DEFAULT_CONVERSATIONS_BAR_SVG;
}
