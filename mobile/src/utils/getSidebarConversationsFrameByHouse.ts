import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

/**
 * @deprecated El sidebar usa SVG por clan (`getSidebarConversationsBarSvgByHouse`).
 * Se mantiene por si hace falta el PNG en otro flujo.
 *
 * Marco PNG del contenedor de conversaciones (borde = clan; interior negro).
 *
 * Asignación explícita por clan (no inferir por orden de archivos):
 * - Sin clan / Evocon → verde lima
 * - Nihilista → #bdb29c
 * - Cientista → #529da2
 * - Estoico → #818a41
 * - Existencialista → #c93a39
 * - Racionalista → #395df2
 * - Humanista → #efb318
 * - Realista → #a2a3a8
 * - Trascendentalista → #8d61d1
 */
const CONVERSATIONS_FRAME_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/conversations/conversations_nihilista.png'),
  cientista: require('../assets/sidebar/conversations/conversations_cientista.png'),
  estoico: require('../assets/sidebar/conversations/conversations_estoico.png'),
  existencialista: require('../assets/sidebar/conversations/conversations_existencialista.png'),
  racionalista: require('../assets/sidebar/conversations/conversations_racionalista.png'),
  humanista: require('../assets/sidebar/conversations/conversations_humanista.png'),
  realista: require('../assets/sidebar/conversations/conversations_realista.png'),
  trascendentalista: require('../assets/sidebar/conversations/conversations_trascendentalista.png'),
};

/** Sin clan / Evocon — borde verde lima. */
export const SIDEBAR_DEFAULT_CONVERSATIONS_FRAME: ImageSourcePropType = require('../assets/sidebar/conversations/conversations_default.png');

export function getConversationsFrameByHouse(house?: string | null): ImageSourcePropType {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_CONVERSATIONS_FRAME;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (CONVERSATIONS_FRAME_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_CONVERSATIONS_FRAME;
}
