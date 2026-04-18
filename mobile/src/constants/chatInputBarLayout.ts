/**
 * Editable layout & color config for the chat bottom area
 * (input bar + send button + surrounding container).
 */

/** Outer container that wraps input + button. */
export const CHAT_BOTTOM_AREA_LAYOUT = {
  offsetY: 0,
  height: null as number | null,
  paddingBottom: 12,
  paddingTop: 40,
  paddingHorizontal: 12,
  backgroundColor: '#0b0b0f',
  /** Top separator line. Set to 0 to remove. */
  borderTopWidth: 0,
  borderTopColor: '#303030',
} as const;

/** The text input field. */
export const CHAT_INPUT_LAYOUT = {
  offsetX: 0,
  offsetY: -20,
  widthScale: 0.95,
  minHeight: 40,
  maxHeight: 120,
  borderRadius: 24,
  backgroundColor: '#262626',
  borderWidth: 1,
  borderColor: '#303030',
  fontSize: 14,
  paddingHorizontal: 16,
  paddingVertical: 10,
} as const;

/**
 * ── PUBLISH JUMP ISLAND ────────────────────────────────────────────────────
 * Floating clan-colored island that appears when the user's latest reflection
 * scrolls above the visible area.  Tap → scroll back to that reflection.
 */
export const PUBLISH_JUMP_ISLAND_LAYOUT = {
  /**
   * Distance from the bottom of the screen.
   * Decrease to move the island closer to the bottom nav.
   * Increase to push it further up.
   */
  publishJumpIslandBottom: 110,
  /** Horizontal offset from center (positive = right). */
  publishJumpIslandOffsetX: 0,
  /** Fine vertical offset via transform (positive = down). */
  publishJumpIslandOffsetY: 10,
  /** Uniform scale applied to the whole island. */
  publishJumpIslandScale: 1,
  /** Horizontal offset applied only to the label text. */
  publishJumpIslandTextOffsetX: 0,
  /** Vertical offset applied only to the label text. */
  publishJumpIslandTextOffsetY: 0,
  /** Scale applied to both chevron icons. */
  publishJumpIslandChevronScale: 1,
  /** Horizontal gap between each chevron icon and the label. */
  publishJumpIslandChevronGap: 8,
  // ── fixed structural values ──
  borderRadius: 24,
  paddingHorizontal: 20,
  paddingVertical: 10,
  fontSize: 13,
  fontWeight: '700' as const,
  chevronSize: 16,
};

/**
 * ── AI THINKING STAR ──────────────────────────────────────────────────────
 * Pulsing "estrella comunidad" that appears while the AI is generating.
 * Replaces the old spinner + "Pensando…" combo.
 */
export const AI_THINKING_STAR_LAYOUT = {
  /** Horizontal offset (positive = right). */
  thinkingStarOffsetX: 0,
  /** Vertical offset (positive = down). */
  thinkingStarOffsetY: 0,
  /** Base size of the star (logical pixels). */
  thinkingStarScale: 56,
  /** Min scale of the breathing pulse (relative to base). */
  thinkingStarMinScale: 0.85,
  /** Max scale of the breathing pulse (relative to base). */
  thinkingStarMaxScale: 1.15,
  /** One full breath cycle in milliseconds. */
  thinkingStarPulseDurationMs: 1500,
};

/** The send button (clan SVG replaces the old star icon). */
export const CHAT_SEND_BUTTON_LAYOUT = {
  offsetX: -10,
  offsetY: -20,
  scale: 1,
  /** Diameter of the tap target / SVG container. */
  size: 40,
  borderRadius: 22,
  /** 'transparent' because the clan SVG includes its own circular background. */
  backgroundColor: 'transparent',
} as const;
