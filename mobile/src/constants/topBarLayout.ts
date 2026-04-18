export type TopBarItemKey =
  | 'star'
  | 'menu'
  | 'shield'
  | 'clanLabel'
  | 'pencilIcon'
  | 'pencilText'
  | 'fireIcon'
  | 'fireText'
  | 'heartIcon'
  | 'heartText';

export type XY = { x?: number; y?: number };

export const TOP_BAR_LAYOUT = {
  // Added on top of safe-area inset (Dynamic Island / notch)
  SAFE_TOP_OFFSET: -18,

  /**
   * Desplaza **todo** el contenido de la barra (izquierda + centro + derecha) junto.
   * Positivo = hacia abajo, negativo = hacia arriba.
   * No altera `PER_ITEM_OFFSETS` ni gaps: solo mueve el bloque entero como una unidad.
   */
  TOPBAR_WHOLE_SHIFT_Y: 14,

  TOPBAR_PADDING_HORIZONTAL: 15,
  TOPBAR_PADDING_BOTTOM: 15,

  // Minimum height excluding safe-area paddingTop
  TOPBAR_MIN_HEIGHT: -50,

  // Global sizing knobs
  ICON_SIZE_BASE: 22,
  STAR_SIZE: 26,
  MENU_SIZE: 28,
  SHIELD_SIZE: 34,
  CLAN_MARK_SIZE: 16,
  COUNTER_ICON_SIZE: 22,
  COUNTER_TEXT_SIZE: 18,

  // Spacing knobs
  LEFT_CLUSTER_GAP: 0,
  CENTER_CLUSTER_GAP: 0,
  RIGHT_CLUSTER_GAP: 0,

  // Counter pair spacing (icon ↔ number)
  COUNTER_PAIR_GAP: 8,

  // Per-item nudges (fine-tuning)
  // Usa sólo ajustes pequeños para que el layout no cambie en cada reload.
  PER_ITEM_OFFSETS: {
    star:       { x: -8,  y: 0 },
    menu:       { x: -22, y: -10 },

    shield:     { x: 0,   y: 0 },
    clanLabel:  { x: -5, y: 3 },
    pencilIcon: { x: 26,  y: -5 },
    pencilText: { x: 18,  y: -13 },

    fireIcon:   { x:  15,  y: -6 },
    fireText:   { x:  5,  y: -13 },

    heartIcon:  { x: -2, y: -3 },
    heartText:  { x: -12, y: -14 },
  } satisfies Record<TopBarItemKey, XY>,
} as const;

/**
 * Editor independiente por icono/texto de la barra superior: suma a `PER_ITEM_OFFSETS` y aplica `scale`.
 * Cada clave tiene su propio bloque (no compartir entre elementos).
 */
export type TopBarIconEditorKey =
  | 'star'
  | 'menu'
  | 'shield'
  | 'clanLabel'
  | 'pencilIcon'
  | 'pencilText'
  | 'fireIcon'
  | 'fireText'
  | 'heartIcon'
  | 'heartText';

export const TOP_BAR_ICON_EDITOR: Record<
  TopBarIconEditorKey,
  { offsetX: number; offsetY: number; scale: number }
> = {
  star: { offsetX: 2, offsetY: 0, scale: 1 },
  menu: { offsetX: 7, offsetY: 0, scale: 1 },
  shield: { offsetX: -35, offsetY: -1, scale: 1 },
  clanLabel: { offsetX: -30, offsetY: 0, scale: 1.2 },
  pencilIcon: { offsetX: -62, offsetY: -9, scale: 2 },
  pencilText: { offsetX: -45, offsetY: 0, scale: 1.2 },
  fireIcon: { offsetX: -35, offsetY: -11, scale: 2.2 },
  fireText: { offsetX: -20, offsetY: 0, scale: 1.2 },
  heartIcon: { offsetX: -5, offsetY: -14, scale: 2 },
  heartText: { offsetX: 15, offsetY: 0, scale: 1.2 },
};

// ─── Global icon-only editors ──────────────────────────────────────────────
//
// These three values affect ONLY the graphic icon elements (star, menu, shield,
// pencilIcon, fireIcon, heartIcon).  They do NOT touch any text/number element
// (clanLabel, pencilText, fireText, heartText).
//
// topBarIconsScaleMultiplier — multiplies each icon's INDIVIDUAL scale
//   proportionally.  A value of 0.9 means: icon that was 2.0 → 1.8, icon that
//   was 1.0 → 0.9.  It never normalises icons to the same absolute size.
//
// topBarIconsOffsetX / topBarIconsOffsetY — shift ALL icons together on that
//   axis.  Numbers/labels remain at their original positions.
//
export const topBarIconsScaleMultiplier = 0.9;   // 1 = no change
export const topBarIconsOffsetX        = 0;   // px, positive = right
export const topBarIconsOffsetY        = 0;   // px, positive = down

/** Keys that represent graphical icons (not text labels / counters). */
const ICON_KEYS = new Set<TopBarIconEditorKey>([
  'star',
  'menu',
  'shield',
  'pencilIcon',
  'fireIcon',
  'heartIcon',
]);

export function topBarIconEditorStyle(
  editorKey: TopBarIconEditorKey,
  nudgeKey: TopBarItemKey
): {
  transform: ({ translateX: number } | { translateY: number } | { scale: number })[];
} {
  const ed = TOP_BAR_ICON_EDITOR[editorKey];
  const n = TOP_BAR_LAYOUT.PER_ITEM_OFFSETS[nudgeKey];
  const isIcon = ICON_KEYS.has(editorKey);

  // Per-icon scale is multiplied by the global multiplier only for icon elements.
  const finalScale = isIcon ? ed.scale * topBarIconsScaleMultiplier : ed.scale;

  // Global X/Y offsets are added only for icon elements; text positions are untouched.
  const finalX = (n?.x ?? 0) + ed.offsetX + (isIcon ? topBarIconsOffsetX : 0);
  const finalY = (n?.y ?? 0) + ed.offsetY + (isIcon ? topBarIconsOffsetY : 0);

  return {
    transform: [
      { translateX: finalX },
      { translateY: finalY },
      { scale: finalScale },
    ],
  };
}

