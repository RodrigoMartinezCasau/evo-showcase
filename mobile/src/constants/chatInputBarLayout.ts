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
  offsetY: -25,
  widthScale: 0.95,
  minHeight: 40,
  maxHeight: 120,
  borderRadius: 24,
  backgroundColor: '#262626',
  borderWidth: 1,
  borderColor: '#303030',
  /** Text size for both typed text and placeholder ("Escribe tu..."). */
  textFontSize: 16,
  paddingHorizontal: 16,
  paddingVertical: 10,
} as const;

/**
 * ── PUBLISH JUMP ISLAND ────────────────────────────────────────────────────
 * Floating clan-colored island that appears when the user's latest reflection
 * scrolls above the visible area.  Tap → scroll back to that reflection.
 *
 * Posición vertical: `computePublishJumpIslandBottom(safeAreaBottom)` — anclada
 * encima de la barra de chat (no usar `bottom` fijo: en Android colapsa con el input).
 */
export const PUBLISH_JUMP_ISLAND_LAYOUT = {
  /**
   * Hueco mínimo entre el borde superior de la barra de escribir y el borde
   * inferior del botón «¡Publica tu reflexión!» (px).
   * Subir = isla más arriba; bajar = más pegada al input.
   */
  publishJumpIslandClearanceAboveInput: 28,
  /** Margen extra solo en Android (safe area / nav bar variables). iOS: 0. */
  publishJumpIslandAndroidExtraClearance: 6,
  /** @deprecated Sustituido por computePublishJumpIslandBottom — referencia ~110 en iPhone. */
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

/** Altura ocupada por la fila de input (sin safe area ni teclado). */
export function estimateChatInputBarRowHeight(): number {
  return (
    CHAT_BOTTOM_AREA_LAYOUT.paddingTop +
    CHAT_INPUT_LAYOUT.minHeight +
    CHAT_BOTTOM_AREA_LAYOUT.paddingBottom +
    CHAT_INPUT_ISLAND_LAYOUT.extraHeight
  );
}

/**
 * Distancia desde el borde inferior de pantalla hasta el botón «Publica tu reflexión».
 * Mantiene el mismo aspecto en iOS y evita solaparse con ChatInputBar en Android.
 */
export function computePublishJumpIslandBottom(safeAreaBottomInset: number): number {
  return (
    safeAreaBottomInset +
    estimateChatInputBarRowHeight() +
    PUBLISH_JUMP_ISLAND_LAYOUT.publishJumpIslandClearanceAboveInput -
    PUBLISH_JUMP_ISLAND_LAYOUT.publishJumpIslandOffsetY
  );
}

/**
 * ── REFLECTION PUBLISH ELIGIBILITY ───────────────────────────────────────
 * User messages shorter than this threshold are NOT considered publishable
 * reflections. For them: no PublishBlock is shown, no jump-island appears.
 */
export const REFLECTION_PUBLISH_MIN_CHARS = 25;

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

/**
 * ── INTRO TYPING (sin estrella) ───────────────────────────────────────────
 * El intro se revela tipo "máquina de escribir" sin ningún cursor visible.
 * Solo controla la velocidad y el tamaño del lote de caracteres por tick.
 */
export const AI_INTRO_TYPING_LAYOUT = {
  /** Milisegundos por tick. Más bajo = más rápido. Recomendado 12–28. */
  introTypingTickMs: 18,
  /** Cuántos caracteres aparecen por tick. Más alto = revelado más grueso. */
  introTypingCharBatchSize: 4,
  /** Multiplicador global de velocidad (1 = normal, 0.5 = 2× más rápido). */
  introTypingDurationMultiplier: 1,
};

/**
 * ── CHAT INPUT ISLAND ─────────────────────────────────────────────────────
 * Controls the floating island appearance of the chat input bar.
 */
export const CHAT_INPUT_ISLAND_LAYOUT = {
  /**
   * Vertical offset of the whole bar relative to its natural bottom position.
   * Positive = moves up. Negative = moves down.
   */
  relativeOffsetY: 0,
  /**
   * Extra height added to the bar container (in addition to the input's
   * natural height). Useful to make the bar feel more spacious.
   */
  extraHeight: 0,
  /**
   * Height of the gradient fade zone above the input bar.
   * This overlaps the scroll content, making text progressively fade out.
   */
  gradientHeight: 80,
  /**
   * Moves the top start of the gradient fade.
   * Positive = starts lower / closer to the input bubble. Negative = starts higher.
   */
  gradientStartOffsetY: 30,
  /**
   * Opacity of the translucent rectangle behind the input island.
   * The gradient fades from 0 to this value, then remains solid to the bottom.
   */
  islandBackdropOpacity: 0.9,
  /** Number of gradient strips — more strips = smoother gradient. */
  gradientSteps: 14,
  /** Max number of text lines before the input becomes scrollable. */
  maxInputLines: 11,
  /** Approximate line height (pt) used to compute the max input height. */
  lineHeight: 20,
  /**
   * Keyboard sync editors.
   * Increase these numbers to make the input island react faster.
   * 1 = same duration as the native keyboard event. 1.4 = about 40% faster.
   */
  keyboardOpenSpeed: 1.85,
  keyboardCloseSpeed: 1.45,
  /**
   * Fine gap editor between the open keyboard and the input bubble.
   * Positive = bubble moves down closer to keyboard. Negative = more space.
   */
  keyboardBubbleGapOffsetY: 20,
  /**
   * Distance over which the keyboard gap offset fades in/out.
   * Higher = smoother close/open, lower = more immediate.
   */
  keyboardBubbleGapBlendPx: 120,
  /** Minimum duration guard so the animation never snaps instantly. */
  keyboardMinDurationMs: 80,
  /**
   * Empty welcome overlay placement.
   * `welcomeCenterBottomRatio` positions the welcome from the bottom of the
   * screen. Increase it to move the welcome higher, decrease it to move lower.
   */
  welcomeCenterBottomRatio: 0.47,
  /** Fine Y editor for the welcome overlay. Positive = up, negative = down. */
  welcomeCenterOffsetY: 0,
  /**
   * How much the welcome follows the keyboard upward.
   * 0 = stays still. 0.18 = moves up 18% of the keyboard height.
   */
  welcomeKeyboardLiftRatio: 0.3,
  /** Fade-out duration when the user types the first character. */
  welcomeHideDurationMs: 140,
  /** Fade-in duration when the input becomes empty again. */
  welcomeShowDurationMs: 180,
} as const;

/** The send button (clan SVG replaces the old star icon). */
export const CHAT_SEND_BUTTON_LAYOUT = {
  offsetX: -10,
  offsetY: -27,
  scale: 1,
  /** Diameter of the tap target / SVG container. */
  size: 40,
  borderRadius: 22,
  /** 'transparent' because the clan SVG includes its own circular background. */
  backgroundColor: 'transparent',
} as const;
