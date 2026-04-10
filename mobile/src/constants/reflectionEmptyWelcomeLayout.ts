/**
 * Bloque de bienvenida vacío encima del input (Nueva reflexión y Nueva frase comparten estos valores).
 * Editor: mover y escalar el conjunto (título + subtítulo) sin tocar la barra ni el chat.
 */
export const REFLECTION_EMPTY_WELCOME_LAYOUT = {
  /** Desplazamiento horizontal del bloque completo (px). */
  offsetX: 0,
  /** Desplazamiento vertical del bloque completo (px). Positivo = hacia abajo. */
  offsetY: 10,
  /** Escala uniforme del bloque (título y subtítulo juntos). */
  scale: 1,
  paddingHorizontal: 20,
  paddingTop: 8,
  paddingBottom: 10,
  /** Espacio entre el título y el subtítulo (px). */
  subtitleMarginTop: 10,
  /** Ancho máximo del subtítulo (px). */
  subtitleMaxWidth: 340,
} as const;
