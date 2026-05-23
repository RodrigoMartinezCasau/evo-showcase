import { Dimensions, Platform, type KeyboardEvent } from 'react-native';
import {
  CHAT_BOTTOM_AREA_LAYOUT as AREA,
  CHAT_INPUT_LAYOUT as INP,
  CHAT_INPUT_ISLAND_LAYOUT as ISLAND,
} from './chatInputBarLayout';

/** Margen superior/inferior al encuadrar un campo de texto sobre el teclado. */
export const CHAT_KEYBOARD_FIELD_VISIBLE_MARGIN = 20;

/** Reserva mínima bajo el campo cuando el input del scroll tiene foco (sin burbuja de chat). */
export const CHAT_KEYBOARD_FOCUSED_BOTTOM_OVERLAY = 20;

/** Padding extra al fondo del scroll mientras el teclado está abierto en un campo interno. */
export const CHAT_KEYBOARD_SCROLL_EXTRA_PADDING = 40;

/**
 * Colchón adicional cuando el campo con foco es el último del hilo (no hay
 * contenido debajo que permita scroll normal — hay que “estirar” el scroll
 * lo justo para que el delta-scroll pueda subir el input por encima del
 * teclado, sin pasarse). Mantener pequeño: el desplazamiento real lo controla
 * la medición del campo, no el padding.
 */
export const CHAT_KEYBOARD_LAST_ITEM_TAIL_PADDING = 60;

/** Reintentos tras abrir teclado (ms): la animación tarda en estabilizar measureInWindow. */
export const CHAT_KEYBOARD_SCROLL_RETRY_DELAYS_MS = [100, 250, 450] as const;

/** Hueco entre último bloque del scroll y la burbuja de chat inferior. */
export const CHAT_CREATION_GAP_ABOVE_INPUT_PX = 6;

/**
 * Reserva inferior universal para pantallas de creación (reflexión / frase):
 * barra de chat + degradé + separación mínima.
 */
export function chatCreationScrollBottomInset(): number {
  const inputIslandRow =
    AREA.paddingTop + INP.minHeight + AREA.paddingBottom + ISLAND.extraHeight;
  const gradientClearZone = Math.round(ISLAND.gradientHeight * 0.22);
  return CHAT_CREATION_GAP_ABOVE_INPUT_PX + inputIslandRow + gradientClearZone;
}

export function resolveKeyboardHeight(e: KeyboardEvent): number {
  const windowHeight = Dimensions.get('window').height;
  if (Platform.OS === 'ios') {
    return Math.max(0, windowHeight - e.endCoordinates.screenY);
  }
  return e.endCoordinates.height;
}

export function computeScrollDeltaForFieldInWindow(options: {
  windowY: number;
  fieldHeight: number;
  topBarHeight: number;
  keyboardHeight: number;
  chatBottomOverlay: number;
  visibleMargin?: number;
}): number {
  const margin = options.visibleMargin ?? CHAT_KEYBOARD_FIELD_VISIBLE_MARGIN;
  const windowH = Dimensions.get('window').height;
  const visibleTop = options.topBarHeight + margin;
  const visibleBottom =
    windowH - options.keyboardHeight - options.chatBottomOverlay - margin;

  if (visibleBottom <= visibleTop) return 0;

  const fieldTop = options.windowY;
  const fieldBottom = options.windowY + options.fieldHeight;

  if (fieldBottom > visibleBottom) {
    return fieldBottom - visibleBottom;
  }
  if (fieldTop < visibleTop) {
    return fieldTop - visibleTop;
  }
  return 0;
}
