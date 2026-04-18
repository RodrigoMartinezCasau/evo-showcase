/**
 * Texto y espaciado del aviso informativo en el bloque Publicar **solo en modo frase**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO EDITAR ESTOS VALORES
 * ─────────────────────────────────────────────────────────────────────────────
 * Cambia el número/cadena que quieras y guarda el archivo.
 * Fast Refresh actualizará la vista sin perder el estado de la app.
 * (Los valores se usan directamente en línea en el JSX, no en StyleSheet.create.)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NOTE: No uses `as const` aquí — eso congela los tipos como literales y puede
 * impedir que el bundler detecte cambios correctamente.
 */
export const PHRASE_PUBLISH_FORMAT_HINT =
  'Para una mejor visibilidad publica tu frase sin "comillas", "autor" o "comentarios extras" en el texto principal.';

export const PHRASE_PUBLISH_HINT_LAYOUT = {
  // ── Botón ▲ PUBLICAR ────────────────────────────────────────────────────
  /** Padding horizontal *dentro* del botón gris «▲ PUBLICAR» (solo frases). */
  publishActionBarInnerPaddingH: 10,

  // ── Aviso informativo (fila icono + texto) ───────────────────────────────
  /** Espacio entre el aviso y el campo «AÑADE EL AUTOR…». */
  hintMarginBottom: 10,

  // ── Icono ℹ ──────────────────────────────────────────────────────────────
  hintIconSize: 18,
  hintIconMarginRight: 8,
  /** Color del icono ℹ (formato CSS: hex, rgb(), rgba()…). */
  hintIconColor: '#2a2a30',

  // ── Texto del aviso ───────────────────────────────────────────────────────
  hintFontSize: 12,
  hintLineHeight: 17,
  /** Color del texto informativo gris (edita aquí para cambiarlo). */
  hintTextColor: '#2a2a30',
};
