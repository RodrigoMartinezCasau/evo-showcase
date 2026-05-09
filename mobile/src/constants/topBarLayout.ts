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

  /**
   * Escala base del bloque central (móvil). Tablet multiplica además por `TOP_BAR_TABLET_STATS_SCALE_MULTIPLIER`.
   * El encaje por overflow solo **reduce** cuando la fila supera el carril; si cabe, se mantiene en 1.
   */
  RIGHT_CLUSTER_UNIVERSAL_SCALE: 1,

  /**
   * Solo cuando `isTopBarTabletLayout`: multiplica la escala del grupo central.
   * Los móviles usan factor 1 (sin cambio). Ajusta aquí si la tablet se ve pequeña o grande.
   */
  TOP_BAR_TABLET_STATS_SCALE_MULTIPLIER: 1.42,

  /**
   * Lado corto mínimo de la ventana (dp) para considerar tablet en la top bar.
   * 600 deja fuera móviles y phablets típicos; coincide con breakpoints habituales.
   */
  TOP_BAR_TABLET_MIN_SHORTEST_SIDE: 600,

  /** Hueco horizontal entre escudo+etiqueta y cada par lápiz/fuego/corazón (fila única). */
  UNIFIED_STATS_ROW_GAP: 6,

  /**
   * Encaje cuando hay muchas cifras: margen respecto al ancho útil del carril (por lado).
   */
  TOP_BAR_OVERFLOW_SAFE_MARGIN: 10,

  /** Mínimo del factor de encaje (muchas cifras en pantallas estrechas). */
  TOP_BAR_OVERFLOW_MIN_SHRINK: 0.5,

  // Counter pair spacing (icon ↔ number)
  COUNTER_PAIR_GAP: 8,

  // Per-item nudges (fine-tuning). Y se mantiene en 0: la fila usa alignItems:center en AppTopBar.
  PER_ITEM_OFFSETS: {
    star:       { x: -8,  y: 0 },
    menu:       { x: -25, y: 0 },
    shield:     { x: 1,   y: 0 },
    clanLabel:  { x: -4,  y: 0 },
    pencilIcon: { x: 30,  y: 0 },
    pencilText: { x: 22,  y: 0 },
    fireIcon:   { x: 15,  y: 0 },
    fireText:   { x: 5,   y: 0 },
    heartIcon:  { x: -2,  y: 0 },
    heartText:  { x: -12, y: 0 },
  } satisfies Record<TopBarItemKey, XY>,
} as const;

/** Tablet (solo top bar): usa el menor de ancho/alto; móviles quedan fuera por el umbral. */
export function isTopBarTabletLayout(windowWidth: number, windowHeight: number): boolean {
  return Math.min(windowWidth, windowHeight) >= TOP_BAR_LAYOUT.TOP_BAR_TABLET_MIN_SHORTEST_SIDE;
}

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
  shield: { offsetX: -35, offsetY: 0, scale: 1 },
  clanLabel: { offsetX: -30, offsetY: 0, scale: 1.2 },
  pencilIcon: { offsetX: -62, offsetY: 0, scale: 2 },
  pencilText: { offsetX: -45, offsetY: 0, scale: 1.2 },
  fireIcon: { offsetX: -35, offsetY: 0, scale: 2.2 },
  fireText: { offsetX: -20, offsetY: 0, scale: 1.2 },
  heartIcon: { offsetX: -5, offsetY: 0, scale: 2 },
  heartText: { offsetX: 15, offsetY: 0, scale: 1.2 },
};

// ─── Global icon-only editors ──────────────────────────────────────────────
//
// These three values affect ONLY the graphic icon elements (star, menu, shield,
// pencilIcon, fireIcon, heartIcon).  They do NOT touch any text/number element
// (clanLabel, pencilText, fireText, heartText).
//
export const topBarIconsScaleMultiplier = 0.9;   // 1 = no change
export const topBarIconsOffsetX        = 3;      // px, positive = right
export const topBarIconsOffsetY        = 0;      // px, positive = down

// ─── Global ALL-elements editor ────────────────────────────────────────────
//
// topBarAllOffsetX — shifts EVERY element in the top bar (icons + counters +
//   text labels) together on the X axis.  Positive = right, negative = left.
//   Útil para afinar el bloque centrado (clan + lápiz + racha + usos) de forma global.
//
export const topBarAllOffsetX = -4;   // px, positive = right

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

  // Icon-only X/Y offsets + the universal X offset that moves every element.
  const finalX =
    (n?.x ?? 0) +
    ed.offsetX +
    (isIcon ? topBarIconsOffsetX : 0) +
    topBarAllOffsetX;
  const finalY = (n?.y ?? 0) + ed.offsetY + (isIcon ? topBarIconsOffsetY : 0);

  return {
    transform: [
      { translateX: finalX },
      { translateY: finalY },
      { scale: finalScale },
    ],
  };
}

/**
 * Altura vertical que ocupa `AppTopBar` en el layout (padding safe + fila de iconos + padding inferior).
 * Usar en **todas** las pantallas que calculan `contentHeight` / listas bajo la barra inferior flotante.
 * Debe mantenerse alineado con `AppTopBar.tsx` (paddingTop / paddingBottom / fila más alta).
 */
export function getAppTopBarLayoutHeight(insetTop: number): number {
  const paddingTop = insetTop + TOP_BAR_LAYOUT.SAFE_TOP_OFFSET;
  const iconVerticalPad = 12; // `iconBtn` / `counterBtn` paddingVertical: 6 × 2
  const rowBody = Math.max(
    TOP_BAR_LAYOUT.SHIELD_SIZE + iconVerticalPad,
    TOP_BAR_LAYOUT.MENU_SIZE + iconVerticalPad,
    TOP_BAR_LAYOUT.STAR_SIZE + iconVerticalPad,
    TOP_BAR_LAYOUT.COUNTER_ICON_SIZE + iconVerticalPad,
  );
  const contentH = paddingTop + rowBody + TOP_BAR_LAYOUT.TOPBAR_PADDING_BOTTOM;
  const minH = TOP_BAR_LAYOUT.TOPBAR_MIN_HEIGHT + insetTop;
  return Math.max(contentH, minH);
}

