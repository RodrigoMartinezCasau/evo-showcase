import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import SvgNietzsche from '../assets/filosofos/Niezsche.svg';
import SvgSchopenhauer from '../assets/filosofos/schopenhauer.svg';
import SvgDawkins from '../assets/filosofos/dawkings.svg';
import SvgSagan from '../assets/filosofos/sagan.svg';
import SvgHawking from '../assets/filosofos/hawking.svg';
import SvgDarwin from '../assets/filosofos/darwin.svg';
import SvgMarcoAurelio from '../assets/filosofos/marcoaurelio.svg';
import SvgSeneca from '../assets/filosofos/seneca.svg';
import SvgMusashi from '../assets/filosofos/musashi.svg';
import SvgSartre from '../assets/filosofos/sartre.svg';
import SvgHeidegger from '../assets/filosofos/heidegger.svg';
import SvgKierkegaard from '../assets/filosofos/kirkegard.svg';
import SvgDescartes from '../assets/filosofos/descartes.svg';
import SvgSpinoza from '../assets/filosofos/spinozza.svg';
import SvgLeibniz from '../assets/filosofos/leibniz.svg';
import SvgKant from '../assets/filosofos/kant.svg';
import SvgRousseau from '../assets/filosofos/rousseau.svg';
import SvgErasmo from '../assets/filosofos/erasmo.svg';
import SvgFromm from '../assets/filosofos/fromm.svg';
import SvgMaslow from '../assets/filosofos/maslow.svg';
import SvgMaquiavelo from '../assets/filosofos/maquiavelo.svg';
import SvgHobbes from '../assets/filosofos/hobbes.svg';
import SvgTocqueville from '../assets/filosofos/tocqueville.svg';
import SvgWeber from '../assets/filosofos/weber.svg';
import SvgEmerson from '../assets/filosofos/emerson.svg';
import SvgThoreau from '../assets/filosofos/thoreau.svg';
import SvgJung from '../assets/filosofos/Jung.svg';
import SvgFuller from '../assets/filosofos/fuller.svg';
import SvgMainlander from '../assets/filosofos/mainlander.svg';
import SvgCamus from '../assets/filosofos/camus.svg';
import SvgEpicteto from '../assets/filosofos/epicteto.svg';
import SvgSimone from '../assets/filosofos/simone.svg';
import SvgNKant from '../assets/filosofos/nkant.svg';
import SvgNLeibniz from '../assets/filosofos/nleibniz.svg';

const PHILOSOPHER_SVGS: Record<string, FC<SvgProps>> = {
  nietzsche: SvgNietzsche,
  schopenhauer: SvgSchopenhauer,
  dawkins: SvgDawkins,
  sagan: SvgSagan,
  hawking: SvgHawking,
  darwin: SvgDarwin,
  marcoaurelio: SvgMarcoAurelio,
  seneca: SvgSeneca,
  musashi: SvgMusashi,
  sartre: SvgSartre,
  heidegger: SvgHeidegger,
  kierkegaard: SvgKierkegaard,
  descartes: SvgDescartes,
  spinoza: SvgSpinoza,
  leibniz: SvgLeibniz,
  kant: SvgKant,
  rousseau: SvgRousseau,
  erasmo: SvgErasmo,
  fromm: SvgFromm,
  maslow: SvgMaslow,
  maquiavelo: SvgMaquiavelo,
  hobbes: SvgHobbes,
  tocqueville: SvgTocqueville,
  weber: SvgWeber,
  emerson: SvgEmerson,
  thoreau: SvgThoreau,
  jung: SvgJung,
  fuller: SvgFuller,
  mainlander: SvgMainlander,
  camus: SvgCamus,
  epicteto: SvgEpicteto,
  simone: SvgSimone,
  nkant: SvgNKant,
  nleibniz: SvgNLeibniz,
};

/** Devuelve el componente SVG del filósofo o `null` si no tiene icono. */
export function getPhilosopherSvg(svgKey: string): FC<SvgProps> | null {
  return PHILOSOPHER_SVGS[svgKey.toLowerCase()] ?? null;
}
