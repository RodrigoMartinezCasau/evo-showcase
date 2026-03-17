export type TopBarItemKey =
  | 'star'
  | 'menu'
  | 'shield'
  | 'clanLabel'
  | 'clanQLeft'
  | 'clanQRight'
  | 'pencilIcon'
  | 'pencilText'
  | 'fireIcon'
  | 'fireText'
  | 'heartIcon'
  | 'heartText';

export type XY = { x?: number; y?: number };

export const TOP_BAR_LAYOUT = {
  // Added on top of safe-area inset (Dynamic Island / notch)
  SAFE_TOP_OFFSET: 5,

  TOPBAR_PADDING_HORIZONTAL: 16,
  TOPBAR_PADDING_BOTTOM: 10,

  // Minimum height excluding safe-area paddingTop
  TOPBAR_MIN_HEIGHT: 56,

  // Global sizing knobs
  ICON_SIZE_BASE: 22,
  STAR_SIZE: 26,
  MENU_SIZE: 28,
  SHIELD_SIZE: 34,
  CLAN_MARK_SIZE: 16,
  COUNTER_ICON_SIZE: 22,
  COUNTER_TEXT_SIZE: 18,

  // Spacing knobs
  LEFT_CLUSTER_GAP: 12,
  CENTER_CLUSTER_GAP: 10,
  RIGHT_CLUSTER_GAP: 14,

  // Counter pair spacing (icon ↔ number)
  COUNTER_PAIR_GAP: 8,

  // Per-item nudges (fine-tuning)
  PER_ITEM_OFFSETS: {
    // Restored from your last tuned values (before deletion)
    star: { x: -20, y: -20 },
    menu: { x: -45, y: -30 },
    shield: { x: -20, y: -19 },
    clanLabel: { x: -20, y: -20 },
    // Default placement for white question marks around the shield
    clanQLeft: { x: -16, y: -4 },
    clanQRight: { x: 16, y: -4 },
    pencilIcon: { x: 31, y: -24 },
    pencilText: { x: 25, y: -35 },
    fireIcon: { x: 5, y: -24 },
    fireText: { x: -5, y: -35 },
    heartIcon: { x: -25, y: -20 },
    heartText: { x: -35, y: -35 },
  } satisfies Record<TopBarItemKey, XY>,
} as const;

