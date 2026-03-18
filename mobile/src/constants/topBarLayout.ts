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

  TOPBAR_PADDING_HORIZONTAL: 15,
  TOPBAR_PADDING_BOTTOM: 0,

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

