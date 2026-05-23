/**
 * Solo el botón "COMUNIDAD" del sidebar (PNG + texto encima).
 * Ajusta aquí posición, tamaño y tipografía sin tocar el resto del drawer.
 */
export const SIDEBAR_COMMUNITY_LAYOUT = {
  // A) Bloque completo (traslación + escala respecto al punto de anclaje del menú)
  SIDEBAR_COMMUNITY_BLOCK_OFFSET_X: -5,
  SIDEBAR_COMMUNITY_BLOCK_OFFSET_Y: -60,
  SIDEBAR_COMMUNITY_BLOCK_SCALE: 1,

  // B) PNG del botón: el asset se estira a este rectángulo; los CROP_* recortan píxeles de verdad.
  // Ajusta ancho/alto a la proporción del PNG si no quieres deformación leve.
  SIDEBAR_COMMUNITY_BUTTON_WIDTH: 290,
  SIDEBAR_COMMUNITY_BUTTON_HEIGHT: 145,
  SIDEBAR_COMMUNITY_BUTTON_OFFSET_X: 0,
  SIDEBAR_COMMUNITY_BUTTON_OFFSET_Y: 0,

  /** Recorte visual (px ocultos por lado). No modifica el PNG en disco. */
  SIDEBAR_COMMUNITY_CROP_TOP: 40,
  SIDEBAR_COMMUNITY_CROP_BOTTOM: 40,
  SIDEBAR_COMMUNITY_CROP_LEFT: 0,
  SIDEBAR_COMMUNITY_CROP_RIGHT: 0,

  /**
   * Estira el botón en horizontal (solo el PNG recortado). 1 = sin cambio; 1.2 ≈ 20 % más ancho.
   * El layout del bloque y el centrado del texto usan este ancho extendido.
   */
  SIDEBAR_COMMUNITY_HORIZONTAL_STRETCH: 1,

  // C) Texto "COMUNIDAD" (capa independiente del crop; caja amplia evita clipping)
  SIDEBAR_COMMUNITY_TEXT_BOX_WIDTH: 220,
  SIDEBAR_COMMUNITY_TEXT_BOX_HEIGHT: 48,
  /** Desplaza la caja de texto respecto al centro del área visible recortada. */
  SIDEBAR_COMMUNITY_TEXT_CONTAINER_OFFSET_X: -51,
  SIDEBAR_COMMUNITY_TEXT_CONTAINER_OFFSET_Y: -0,
  SIDEBAR_COMMUNITY_TEXT_OFFSET_X: 0,
  SIDEBAR_COMMUNITY_TEXT_OFFSET_Y: 0,
  SIDEBAR_COMMUNITY_TEXT_FONT_SIZE: 18,
  SIDEBAR_COMMUNITY_TEXT_LETTER_SPACING: 0,

  /** Estrella fija a la izquierda del botón (misma capa absoluta que otros overlays del menú PNG). */
  SIDEBAR_COMMUNITY_STAR_OFFSET_X: 8,
  SIDEBAR_COMMUNITY_STAR_OFFSET_Y: 20,
  SIDEBAR_COMMUNITY_STAR_WIDTH: 26,
  SIDEBAR_COMMUNITY_STAR_HEIGHT: 26,
  /** Escala uniforme de la estrella (1 = tamaño base según WIDTH/HEIGHT). */
  SIDEBAR_COMMUNITY_STAR_SCALE: 0.9,
} as const;

/**
 * Botón COMUNIDAD (fondo app + destellos + reborde por clan).
 * Edita estos valores y recarga la app; no hace falta tocar SidebarPngMenuButton.tsx.
 */
export const SIDEBAR_COMMUNITY_SIN_CLAN = {
  /** Margen superior del rectángulo de fondo/reborde (px). */
  INSET_TOP: 10,
  /** Margen inferior (px). */
  INSET_BOTTOM: 10,
  /** Esquinas redondeadas del fondo y del reborde. */
  BORDER_RADIUS: 6,

  /**
   * Largo del brazo horizontal del reborde en cada esquina (arriba/abajo), en px.
   * `null` = automático hasta casi el centro: (ancho útil − 2×radio) / 2.
   * Número fijo = ese largo siempre (ej. 100).
   */
  RIM_ARM_X: null as number | null,
  /** Suma extra al brazo horizontal (auto o fijo). Positivo = más largo / puede solaparse en el centro. */
  RIM_ARM_X_EXTRA: 25,

  /**
   * Largo del brazo vertical del reborde en cada esquina (izq/der), en px.
   * `null` = automático: (alto útil − 2×radio) / 2.
   */
  RIM_ARM_Y: null as number | null,
  /** Suma extra al brazo vertical. */
  RIM_ARM_Y_EXTRA: 80,
  /** Mínimo del brazo vertical cuando RIM_ARM_Y es null. */
  RIM_ARM_Y_MIN: 4,
} as const;

export type SidebarSinClanRimResolved = {
  insetTop: number;
  bodyHeight: number;
  borderRadius: number;
  rimArmX: number;
  rimArmY: number;
};

/** Calcula inset y brazos del reborde a partir del tamaño visible del botón. */
export function resolveSidebarSinClanRim(
  layoutW: number,
  visibleH: number,
): SidebarSinClanRimResolved {
  const cfg = SIDEBAR_COMMUNITY_SIN_CLAN;
  const r = cfg.BORDER_RADIUS;
  const bodyHeight = Math.max(
    1,
    visibleH - cfg.INSET_TOP - cfg.INSET_BOTTOM,
  );
  const maxArmX = Math.floor((layoutW - 2 * r) / 2);
  const maxArmY = Math.max(
    cfg.RIM_ARM_Y_MIN,
    Math.floor((bodyHeight - 2 * r) / 2),
  );
  const baseX = cfg.RIM_ARM_X ?? maxArmX;
  const baseY = cfg.RIM_ARM_Y ?? maxArmY;

  return {
    insetTop: cfg.INSET_TOP,
    bodyHeight,
    borderRadius: r,
    rimArmX: baseX + cfg.RIM_ARM_X_EXTRA,
    rimArmY: baseY + cfg.RIM_ARM_Y_EXTRA,
  };
}
