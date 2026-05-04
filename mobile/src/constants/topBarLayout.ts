import { Platform } from 'react-native';

const AND = Platform.OS === 'android';

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
  SAFE_TOP_OFFSET: AND ? -8 : -18,

  /**
   * Desplaza **todo** el contenido de la barra (izquierda + centro + derecha) junto.
   * Positivo = hacia abajo, negativo = hacia arriba.
   * No altera `PER_ITEM_OFFSETS` ni gaps: solo mueve el bloque entero como una unidad.
   */
  TOPBAR_WHOLE_SHIFT_Y: AND ? 6 : 14,

  TOPBAR_PADDING_HORIZONTAL: 15,
  TOPBAR_PADDING_BOTTOM: AND ? 8 : 15,

  // Minimum height excluding safe-area paddingTop
  TOPBAR_MIN_HEIGHT: AND ? -30 : -50,

  // Global sizing knobs
  ICON_SIZE_BASE: 22,
  STAR_SIZE: AND ? 18 : 26,
  MENU_SIZE: AND ? 20 : 28,
  SHIELD_SIZE: AND ? 22 : 34,
  CLAN_MARK_SIZE: 16,
  COUNTER_ICON_SIZE: AND ? 16 : 22,
  COUNTER_TEXT_SIZE: AND ? 11 : 18,

  // Spacing knobs
  LEFT_CLUSTER_GAP: 0,
  CENTER_CLUSTER_GAP: 0,
  RIGHT_CLUSTER_GAP: 0,

  // Counter pair spacing (icon ↔ number)
  COUNTER_PAIR_GAP: AND ? 3 : 8,

  // Per-item nudges (fine-tuning) — valores reducidos para Android
  PER_ITEM_OFFSETS: AND ? {
    star:       { x: 0,   y: 0 },
    menu:       { x: -8,  y: -4 },
    shield:     { x: 0,   y: 0 },
    clanLabel:  { x: -2,  y: 2 },
    pencilIcon: { x: 10,  y: -2 },
    pencilText: { x: 6,   y: -5 },
    fireIcon:   { x: 4,   y: -2 },
    fireText:   { x: 0,   y: -5 },
    heartIcon:  { x: -1,  y: -1 },
    heartText:  { x: -4,  y: -5 },
  } satisfies Record<TopBarItemKey, XY> : {
    star:       { x: -8,  y: 0 },
    menu:       { x: -25, y: -10 },
    shield:     { x: 1,   y: 0 },
    clanLabel:  { x: -4, y: 3 },
    pencilIcon: { x: 30,  y: -5 },
    pencilText: { x: 22,  y: -13 },
    fireIcon:   { x:  15,  y: -5 },
    fireText:   { x:  5,  y: -13 },
    heartIcon:  { x: -2, y: -1 },
    heartText:  { x: -12, y: -14 },
  } satisfies Record<TopBarItemKey, XY>,
};

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
> = AND ? {
  star:       { offsetX: 0,   offsetY: 0,   scale: 0.9 },
  menu:       { offsetX: 2,   offsetY: 0,   scale: 0.9 },
  shield:     { offsetX: -18, offsetY: 0,   scale: 0.9 },
  clanLabel:  { offsetX: -14, offsetY: 0,   scale: 1.0 },
  pencilIcon: { offsetX: -28, offsetY: -4,  scale: 1.2 },
  pencilText: { offsetX: -18, offsetY: 0,   scale: 1.0 },
  fireIcon:   { offsetX: -15, offsetY: -5,  scale: 1.4 },
  fireText:   { offsetX: -8,  offsetY: 0,   scale: 1.0 },
  heartIcon:  { offsetX: -2,  offsetY: -7,  scale: 1.2 },
  heartText:  { offsetX: 6,   offsetY: 0,   scale: 1.0 },
} : {
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
export const topBarIconsScaleMultiplier = AND ? 0.8 : 0.9;  // 1 = no change
export const topBarIconsOffsetX        = AND ? 1 : 3;       // px, positive = right
export const topBarIconsOffsetY        = 0;                 // px, positive = down

// ─── Global ALL-elements editor ────────────────────────────────────────────
//
// topBarAllOffsetX — shifts EVERY element in the top bar (icons + counters +
//   text labels) together on the X axis.  Positive = right, negative = left.
//   Use this to nudge the whole right cluster (lápiz, fuego, corazón + números)
//   without touching any individual editor above.
//
export const topBarAllOffsetX = AND ? -2 : -4;  // px, positive = right

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

