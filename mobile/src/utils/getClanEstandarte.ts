import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import IndefinidoIcon      from '../assets/estandartes/indefinido.svg';
import NihilistaIcon       from '../assets/estandartes/nihilista.svg';
import CientistaIcon       from '../assets/estandartes/cientista.svg';
import EstoicoIcon         from '../assets/estandartes/estoico.svg';
import ExistencialistaIcon from '../assets/estandartes/existencialista.svg';
import TrascendentalistaIcon from '../assets/estandartes/trascendentalista.svg';
import HumanistaIcon       from '../assets/estandartes/humanista.svg';
import RealistaIcon        from '../assets/estandartes/realista.svg';
import RacionalistaIcon    from '../assets/estandartes/racionalista.svg';

const ESTANDARTE_MAP: Record<string, FC<SvgProps>> = {
  indefinido:        IndefinidoIcon,
  nihilista:         NihilistaIcon,
  cientista:         CientistaIcon,
  estoico:           EstoicoIcon,
  existencialista:   ExistencialistaIcon,
  trascendentalista: TrascendentalistaIcon,
  humanista:         HumanistaIcon,
  realista:          RealistaIcon,
  racionalista:      RacionalistaIcon,
};

/**
 * Returns the estandarte SVG component for the given clan id.
 * Falls back to IndefinidoIcon for unknown/null ids.
 */
export function getClanEstandarte(clanId: string | null | undefined): FC<SvgProps> {
  if (!clanId || clanId.trim() === '') return IndefinidoIcon;
  const key = clanId.trim().toLowerCase();
  return ESTANDARTE_MAP[key] ?? IndefinidoIcon;
}
