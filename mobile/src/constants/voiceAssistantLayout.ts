import { Platform } from 'react-native';

import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';

export const VOICE_ASSISTANT_LAYOUT = {
  /** Diámetro del botón circular. */
  ORB_SIZE: 52,
  /** Separación desde el borde derecho de la pantalla. */
  ORB_RIGHT_OFFSET: 16,
  /** Separación extra sobre la barra inferior flotante. */
  ORB_BOTTOM_GAP: 10,
  /** Triple estrellas del clan (mismo asset que Nueva reflexión). */
  TRIPLE_STARS_WIDTH: 26,
  TRIPLE_STARS_HEIGHT: 26,
  /** Altura de las barras de audio durante la grabación. */
  WAVEFORM_HEIGHT: 26,
  /** Grosor del borde del círculo (color del clan). */
  ORB_BORDER_WIDTH: 1.5,
  /** Fondo del círculo. */
  ORB_BACKGROUND: 'rgba(0,0,0,0.72)',
} as const;

/** Solo login y registro — en el resto de la app (con sesión) se muestra el orbe. */
export const VOICE_ASSISTANT_HIDDEN_PATH_PREFIXES = ['/login', '/signup'] as const;

export function normalizeAppPathname(pathname: string | null | undefined): string {
  if (!pathname) return '';
  return pathname.split('?')[0].replace(/\/$/, '') || '/';
}

export function isVoiceAssistantHiddenPath(pathname: string | null | undefined): boolean {
  const base = normalizeAppPathname(pathname);
  if (!base) return true;
  return VOICE_ASSISTANT_HIDDEN_PATH_PREFIXES.some(
    (p) => base === p || base.endsWith(p) || base.includes(`${p}/`),
  );
}

/** Offset desde el borde inferior de la pantalla hasta el borde inferior del orbe. */
export function voiceAssistantBottomOffsetPx(insetBottom: number): number {
  const barHeight =
    Platform.OS === 'android'
      ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT_ANDROID
      : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT;
  const clearance =
    Platform.OS === 'android'
      ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_VIEWPORT_CLEARANCE_BELOW_ANDROID
      : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_VIEWPORT_CLEARANCE_BELOW;
  return (
    barHeight +
    insetBottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    clearance +
    VOICE_ASSISTANT_LAYOUT.ORB_BOTTOM_GAP
  );
}
