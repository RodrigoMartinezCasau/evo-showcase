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
const PROGRESSION_STEP = 2; // inputs (reflexión o frase) por tramo

/**
 * Devuelve el SVG de progresión según reflexiones + frases enviadas (misma escala que antes solo con refs).
 * índice = clamp(36 + floor(total / 2), 36, 50)
 */
export function getProgressionIcon(totalReflectionAndPhraseInputs: number): FC<ProgressionSvgProps> {
  const idx = Math.min(
    PROGRESSION_MAX,
    Math.max(
      PROGRESSION_MIN,
      PROGRESSION_MIN + Math.floor(totalReflectionAndPhraseInputs / PROGRESSION_STEP),
    ),
  );
  return PROGRESSION_SVGS[idx] ?? Svg36;
}
