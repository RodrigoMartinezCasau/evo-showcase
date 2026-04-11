import { PHRASE_FOLDER_PLUS_BUTTON_LAYOUT } from './phraseFolderPlusButtonLayout';

/**
 * Bloque «Añadir a carpeta…» (Nueva frase).
 *
 * `height` = altura fija del área de lista (scroll interno); el bloque exterior crece con cabecera + este valor.
 */
export const PHRASE_FOLDER_MANAGER_LAYOUT = {
  height: 130,
  contentOffsetX: 0,
  contentOffsetY: 0,
  star: {
    offsetX: -7,
    offsetY: -3,
    scale: 2,
    size: 16,
    marginRight: 8,
  },
  title: {
    offsetX: -10,
    offsetY: -2,
    fontSize: 18,
    lineHeight: 22,
  },
  /** Misma referencia que `PHRASE_FOLDER_PLUS_BUTTON_LAYOUT` (un solo sitio para editar escala/offset). */
  plusButton: PHRASE_FOLDER_PLUS_BUTTON_LAYOUT,
  content: {
    offsetX: 0,
    offsetY: 0,
    widthScale: 1,
  },
} as const;
