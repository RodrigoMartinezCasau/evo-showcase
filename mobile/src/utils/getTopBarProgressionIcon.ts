import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import Svg36 from '../assets/topbar/progresionSvg/36.svg';
import Svg37 from '../assets/topbar/progresionSvg/37.svg';
import Svg38 from '../assets/topbar/progresionSvg/38.svg';
import Svg39 from '../assets/topbar/progresionSvg/39.svg';
import Svg40 from '../assets/topbar/progresionSvg/40.svg';
import Svg41 from '../assets/topbar/progresionSvg/41.svg';
import Svg42 from '../assets/topbar/progresionSvg/42.svg';
import Svg43 from '../assets/topbar/progresionSvg/43.svg';
import Svg44 from '../assets/topbar/progresionSvg/44.svg';
import Svg45 from '../assets/topbar/progresionSvg/45.svg';
import Svg46 from '../assets/topbar/progresionSvg/46.svg';
import Svg47 from '../assets/topbar/progresionSvg/47.svg';
import Svg48 from '../assets/topbar/progresionSvg/48.svg';
import Svg49 from '../assets/topbar/progresionSvg/49.svg';
import Svg50 from '../assets/topbar/progresionSvg/50.svg';
import { REVEAL_TOTAL_INPUTS_THRESHOLD } from '@evoconn/hooks/ClassificationContext';

export type ProgressionSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const PROGRESSION_SVGS: Record<number, FC<ProgressionSvgProps>> = {
  36: Svg36,
  37: Svg37,
  38: Svg38,
  39: Svg39,
  40: Svg40,
  41: Svg41,
  42: Svg42,
  43: Svg43,
  44: Svg44,
  45: Svg45,
  46: Svg46,
  47: Svg47,
  48: Svg48,
  49: Svg49,
  50: Svg50,
};

const PROGRESSION_MIN = 36;
const PROGRESSION_MAX = 50;
const PROGRESSION_SPAN = PROGRESSION_MAX - PROGRESSION_MIN;

/**
 * Badge "Sin clan" en la top bar: SVG 36 (inicio) → 50 (justo antes del reveal).
 *
 * Antes: +1 cada 2 inputs → el 50 solo llegaba con ~28 envíos, pero el clan
 * puede revelarse con 10 (REVEAL_TOTAL_INPUTS_THRESHOLD), así que el badge
 * se quedaba siempre en los SVG intermedios (37–43).
 */
export function getProgressionIcon(totalReflectionAndPhraseInputs: number): FC<ProgressionSvgProps> {
  const total = Math.max(0, totalReflectionAndPhraseInputs);
  const progress = Math.min(1, total / REVEAL_TOTAL_INPUTS_THRESHOLD);
  const idx = PROGRESSION_MIN + Math.round(progress * PROGRESSION_SPAN);
  return PROGRESSION_SVGS[idx] ?? Svg36;
}
