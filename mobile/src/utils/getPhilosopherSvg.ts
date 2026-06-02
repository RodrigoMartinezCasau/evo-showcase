import type { ImageSourcePropType } from 'react-native';

/**
 * Retratos de filósofos como PNG reales (extraídos del PNG que venía incrustado
 * en los antiguos SVG de 1,5 MB). Se renderizan con expo-image, que downsamplea
 * al tamaño real, cachea en disco y decodifica fuera del hilo de UI — evitando
 * los picos de memoria que crasheaban la pantalla de clan en gama baja.
 */
const PHILOSOPHER_IMAGES: Record<string, ImageSourcePropType> = {
  nietzsche: require('../assets/filosofosPng/Niezsche.png'),
  schopenhauer: require('../assets/filosofosPng/schopenhauer.png'),
  dawkins: require('../assets/filosofosPng/dawkings.png'),
  sagan: require('../assets/filosofosPng/sagan.png'),
  hawking: require('../assets/filosofosPng/hawking.png'),
  darwin: require('../assets/filosofosPng/darwin.png'),
  marcoaurelio: require('../assets/filosofosPng/marcoaurelio.png'),
  seneca: require('../assets/filosofosPng/seneca.png'),
  musashi: require('../assets/filosofosPng/musashi.png'),
  sartre: require('../assets/filosofosPng/sartre.png'),
  heidegger: require('../assets/filosofosPng/heidegger.png'),
  kierkegaard: require('../assets/filosofosPng/kirkegard.png'),
  descartes: require('../assets/filosofosPng/descartes.png'),
  spinoza: require('../assets/filosofosPng/spinozza.png'),
  leibniz: require('../assets/filosofosPng/leibniz.png'),
  kant: require('../assets/filosofosPng/kant.png'),
  rousseau: require('../assets/filosofosPng/rousseau.png'),
  erasmo: require('../assets/filosofosPng/erasmo.png'),
  fromm: require('../assets/filosofosPng/fromm.png'),
  maslow: require('../assets/filosofosPng/maslow.png'),
  maquiavelo: require('../assets/filosofosPng/maquiavelo.png'),
  hobbes: require('../assets/filosofosPng/hobbes.png'),
  tocqueville: require('../assets/filosofosPng/tocqueville.png'),
  weber: require('../assets/filosofosPng/weber.png'),
  emerson: require('../assets/filosofosPng/emerson.png'),
  thoreau: require('../assets/filosofosPng/thoreau.png'),
  jung: require('../assets/filosofosPng/Jung.png'),
  fuller: require('../assets/filosofosPng/fuller.png'),
  mainlander: require('../assets/filosofosPng/mainlander.png'),
  camus: require('../assets/filosofosPng/camus.png'),
  epicteto: require('../assets/filosofosPng/epicteto.png'),
  simone: require('../assets/filosofosPng/simone.png'),
  nkant: require('../assets/filosofosPng/nkant.png'),
  nleibniz: require('../assets/filosofosPng/nleibniz.png'),
};

/** Devuelve la fuente PNG del retrato del filósofo o `null` si no tiene icono. */
export function getPhilosopherImage(svgKey: string): ImageSourcePropType | null {
  return PHILOSOPHER_IMAGES[svgKey.toLowerCase()] ?? null;
}
