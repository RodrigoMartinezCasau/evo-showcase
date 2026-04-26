/**
 * Editable layout constants for the structured AI response display.
 *
 * Each card (ArgumentCard, QuestionCard, DebateQuoteCard, PublishBlock)
 * pulls values from here so you can tweak spacing/sizes in one place.
 */

/* ──────────────────────────────────────────────
 * PART 1 — Individual gaps between blocks
 * ────────────────────────────────────────────── */

/**
 * ── INTER-BLOCK SPACING ──────────────────────────────
 * Gap (px) between each pair of main sections in the AI response.
 * Adjust freely — no rebuild needed.
 */
export const AI_RESPONSE_BLOCK_GAPS = {
  /** Gap from Publicar block to TU POSTURA. */
  publishToStance: 0,
  /** Gap from TU POSTURA to CONTRAPOSTURA. */
  postureToCounterpoint: 0,
  /** Gap from CONTRAPOSTURA to PREGUNTA REFLEXIVA. */
  counterpointToQuestion: 0,
  /** Gap from PREGUNTA REFLEXIVA to CITA TEXTUAL. */
  questionToQuote: -10,
  /** Legacy — kept for backward compat. */
  quoteToPublish: 0,
};

/** Per-block border thickness (px). */
export const AI_RESPONSE_BORDER_WIDTH = {
  posture: 3,
  counterpoint: 3,
  question: 3,
  quote: 3,
  publish: 3,
} as const;

/* ──────────────────────────────────────────────
 * PART 2 — Per-clan BORDER colors (per block)
 * ────────────────────────────────────────────── */

type ClanColorMap = {
  noClan: string;
  nihilista: string;
  racionalista: string;
  estoico: string;
  humanista: string;
  existencialista: string;
  trascendentalista: string;
  cientista: string;
  realista: string;
};

export const AI_RESPONSE_BORDER_COLORS: Record<string, ClanColorMap> = {
  posture: {
    noClan: '#c7ff02',
    nihilista: '#bdb29c',
    racionalista: '#395df2',
    estoico: '#818a41',
    humanista: '#efb318',
    existencialista: '#c93a39',
    trascendentalista: '#8d61d1',
    cientista: '#529da2',
    realista: '#a2a3a8',
  },
  counterpoint: {
    noClan: '#7000ff',
    nihilista: '#535147',
    racionalista: '#46b8f9',
    estoico: '#444827',
    humanista: '#d08733',
    existencialista: '#f9bc4b',
    trascendentalista: '#4e327b',
    cientista: '#fdfef0',
    realista: '#f9a666',
  },
};

/* ──────────────────────────────────────────────
 * PART 2b — Unified per-clan colors for
 *   Pregunta, Cita, Publicar
 *
 *   publishBackground → fondo del bloque ¡PUBLICAR!
 *   borderPrimary     → borde de Pregunta, Cita y Publicar
 *   questionBackground → fondo bloque Pregunta
 *   quoteBackground    → fondo bloque Cita
 * ────────────────────────────────────────────── */

type ClanDisplayEntry = {
  publishBackground: string;
  borderPrimary: string;
  questionBackground: string;
  quoteBackground: string;
  titleOutlineColor: string;
};

export const CLAN_DISPLAY_COLORS: Record<keyof ClanColorMap, ClanDisplayEntry> = {
  noClan: {
    publishBackground: '#c7ff1a',
    borderPrimary: '#7000ff',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#4f59fe',
  },
  nihilista: {
    publishBackground: '#bdb29c',
    borderPrimary: '#37343b',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#37343b',
  },
  racionalista: {
    publishBackground: '#395df2',
    borderPrimary: '#46b8f9',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#008ad8',
  },
  estoico: {
    publishBackground: '#818a41',
    borderPrimary: '#232323',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#2a2a30',
  },
  humanista: {
    publishBackground: '#efb318',
    borderPrimary: '#2d996a',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#2d996a',
  },
  existencialista: {
    publishBackground: '#c93a39',
    borderPrimary: '#591c2d',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#591c2d',
  },
  trascendentalista: {
    publishBackground: '#8d61d1',
    borderPrimary: '#3f2247',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#3f2247',
  },
  cientista: {
    publishBackground: '#529da2',
    borderPrimary: '#298280',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#298280',
  },
  realista: {
    publishBackground: '#a2a3a8',
    borderPrimary: '#696969',
    questionBackground: '#0f0f12',
    quoteBackground: '#0f0f12',
    titleOutlineColor: '#696969',
  },
};

/* ──────────────────────────────────────────────
 * PART 3 — Per-clan BACKGROUND colors
 *   (posture / counterpoint only — the rest
 *    is resolved from CLAN_DISPLAY_COLORS)
 * ────────────────────────────────────────────── */

export const AI_RESPONSE_BACKGROUND_COLORS: Record<string, ClanColorMap> = {
  posture: {
    noClan: '#262626',
    nihilista: '#262626',
    racionalista: '#262626',
    estoico: '#262626',
    humanista: '#262626',
    existencialista: '#262626',
    trascendentalista: '#262626',
    cientista: '#262626',
    realista: '#262626',
  },
  counterpoint: {
    noClan: '#262626',
    nihilista: '#262626',
    racionalista: '#262626',
    estoico: '#262626',
    humanista: '#262626',
    existencialista: '#262626',
    trascendentalista: '#262626',
    cientista: '#262626',
    realista: '#262626',
  },
};

/* ──────────────────────────────────────────────
 * Resolver helpers
 * ────────────────────────────────────────────── */

function clanKey(clanId: string | null | undefined): keyof ClanColorMap {
  if (!clanId || String(clanId).trim() === '') return 'noClan';
  const k = clanId.trim().toLowerCase();
  if (k in AI_RESPONSE_BORDER_COLORS.posture) return k as keyof ClanColorMap;
  return 'noClan';
}

export function getPublishTitleOutlineColor(
  clanId: string | null | undefined,
): string {
  return CLAN_DISPLAY_COLORS[clanKey(clanId)]?.titleOutlineColor ?? '#4f59fe';
}

export function getBlockBorderColor(
  block: string,
  clanId: string | null | undefined,
): string {
  const k = clanKey(clanId);
  if (block === 'question' || block === 'quote' || block === 'publish') {
    return CLAN_DISPLAY_COLORS[k]?.borderPrimary ?? '#3A3A3A';
  }
  return AI_RESPONSE_BORDER_COLORS[block]?.[k] ?? '#3A3A3A';
}

export function getBlockBackgroundColor(
  block: string,
  clanId: string | null | undefined,
): string {
  const k = clanKey(clanId);
  if (block === 'publish') return CLAN_DISPLAY_COLORS[k]?.publishBackground ?? '#262626';
  if (block === 'question') return CLAN_DISPLAY_COLORS[k]?.questionBackground ?? '#0f0f12';
  if (block === 'quote') return CLAN_DISPLAY_COLORS[k]?.quoteBackground ?? '#0f0f12';
  return AI_RESPONSE_BACKGROUND_COLORS[block]?.[k] ?? '#262626';
}

/* ──────────────────────────────────────────────
 * PART 4 — Fine-grained position/size editors
 *
 * AI_RESPONSE_LAYOUT — single config for all
 * editable element positions and sizes.
 * ────────────────────────────────────────────── */

type StarEditor = {
  offsetX: number;
  offsetY: number;
  scale: number;
  /** Base size in dp (effective = size × scale). */
  size: number;
  marginRight: number;
};

type TextEditor = {
  offsetX: number;
  offsetY: number;
  fontSize: number;
  /** 0 = use default / auto. */
  lineHeight: number;
};

export const AI_RESPONSE_LAYOUT = {
  /* ── A) Stars ── */
  stars: {
    posture:      { offsetX: -10, offsetY: -10, scale: 3, size: 18, marginRight: 8 } as StarEditor,
    counterpoint: { offsetX: -10, offsetY: -10, scale: 3, size: 18, marginRight: 8 } as StarEditor,
    question:     { offsetX: -7, offsetY: -3, scale: 2, size: 16, marginRight: 8 } as StarEditor,
    quote:        { offsetX: -7, offsetY: -3, scale: 2, size: 16, marginRight: 8 } as StarEditor,
    publish:      { offsetX: -7, offsetY: -10, scale: 2.5, size: 16, marginRight: 8 } as StarEditor,
  },

  /* ── B) Display titles (block headers) ── */
  displayTitles: {
    posture:      { offsetX: -10, offsetY: -15, fontSize: 22, lineHeight: 0 } as TextEditor,
    counterpoint: { offsetX: -10, offsetY: -15, fontSize: 22, lineHeight: 0 } as TextEditor,
    question:     { offsetX: -10, offsetY: -2, fontSize: 20, lineHeight: 0 } as TextEditor,
    quote:        { offsetX: -10, offsetY: -2, fontSize: 20, lineHeight: 0 } as TextEditor,
    publish:      { offsetX: -220, offsetY: -0, fontSize: 20, lineHeight: 0 } as TextEditor,
  },

  /* ── C) Body container (moves all points + bullets as a group) ── */
  bodyContainer: { offsetX: 0, offsetY: -15 },

  /* ── D) Point titles (numbered headings inside cards) ── */
  pointTitles: { offsetX: 0, offsetY: 0, fontSize: 16, lineHeight: 22 } as TextEditor,

  /* ── E) Point bullets / gray text ── */
  pointBullets: { offsetX: 0, offsetY: 0, fontSize: 14, lineHeight: 23 } as TextEditor,

  /* ── F) Summary container (moves label + body as a group) ── */
  summaryContainer: { offsetX: 0, offsetY: 0 },

  /* ── G) Summary section ── */
  summary: {
    label: { offsetX: 0, offsetY: 0, fontSize: 11, lineHeight: 16 } as TextEditor,
    body:  { offsetX: 0, offsetY: 0, fontSize: 13, lineHeight: 22 } as TextEditor,
  },
} as const;

export type { StarEditor, TextEditor };

/* ──────────────────────────────────────────────
 * Shared structural metrics & colors
 * (kept separate — NOT position/size editors)
 * ────────────────────────────────────────────── */

export const DEBATE_HEADER_LAYOUT = {
  letterSpacing: 1.2,
  marginBottom: 14,
  titleColor: '#FFFFFF',
} as const;

export const DEBATE_CARD_LAYOUT = {
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 16,
} as const;

/**
 * ── INTRA-POINT SPACING ──────────────────────────────
 * Spacing inside each numbered point block (title + bullets).
 */
export const DEBATE_POINT_LAYOUT = {
  titleColor: '#FFFFFF',
  bulletColor: '#A0A0A0',
  /** Vertical gap between consecutive numbered points (e.g. 1 → 2 → 3). */
  pointGap: 18,
  /** Gap between a point's bold title and its first bullet line. */
  titleToBulletGap: 10,
  /** Vertical gap between individual bullet lines within the same point. */
  bulletGap: 10,
  bulletIndent: 16,
};

/**
 * ── RESUMEN RÁPIDO SPACING ──────────────────────────────
 * Controls the divider and text inside the quick-summary section.
 */
export const DEBATE_SUMMARY_LAYOUT = {
  dividerColor: '#3A3A3A',
  /** Vertical space above and below the thin divider line before RESUMEN RÁPIDO. */
  dividerMarginVertical: 14,
  labelColor: '#808080',
  textColor: '#C0C0C0',
};

/* ──────────────────────────────────────────────
 * PART 6 — Unified special-block layout
 *
 * Controls heights, outer padding, inner cards,
 * and every internal text for Pregunta, Cita,
 * and Publicar blocks.
 * ────────────────────────────────────────────── */

export const AI_SPECIAL_BLOCK_LAYOUT = {
  /* ── A) Min-height base (dynamic: actual height = max of all 3) ── */
  baseMinHeight: 120,

  /* ── A2) Outer card padding ── */
  outerPaddingH: 14,
  outerPaddingV: 14,
  headerMarginBottom: 10,

  /* ── B) Inner cards (left-accent-only) ── */
  questionCard: {
    offsetX: 0,
    offsetY: 0,
    widthScale: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#171717',
    accentColor: '#FFFFFF',
    accentWidth: 4,
  },
  quoteCard: {
    offsetX: 0,
    offsetY: 0,
    widthScale: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#171717',
    accentColorFallback: '#C93A3A',
    accentWidth: 4,
  },

  /* ── C) Text editors — Pregunta Reflexiva ── */
  questionText: { offsetX: 0, offsetY: 0, fontSize: 13, lineHeight: 18, color: '#E0E0E0' },

  /* ── D) Text editors — Cita Textual ── */
  quoteText:        { offsetX: 0, offsetY: 0, fontSize: 13, lineHeight: 18, color: '#FFFFFF' },
  quoteAuthor:      { offsetX: 0, offsetY: 0, fontSize: 11, lineHeight: 0,  color: '#808080' },
  unlockedLabel:    { offsetX: 0, offsetY: 0, fontSize: 9,  lineHeight: 0,  color: '#C7FF02' },
  widgetButtonText: { offsetX: 0, offsetY: 0, fontSize: 10, lineHeight: 0,  color: '#C7FF02' },
  widgetButtonBorder: '#C7FF02',
  widgetButtonBorderRadius: 6,
  widgetButtonPaddingH: 8,
  widgetButtonPaddingV: 3,

  /* ── E) Text editors — ¡PUBLICAR! ── */
  publishTitle: { offsetX: -90, offsetY: -5, fontSize: 24, lineHeight: 0, color: '#FFFFFF', scale: 1.2, outlineWidth: 1.5 },
  publishInput: { offsetX: 0, offsetY: 0, fontSize: 13, lineHeight: 0, color: '#FFFFFF' },
  publishInputPlaceholderColor: '#606060',
  publishInputBackground: '#2A2A30',
  publishInputBorderRadius: 10,
  publishInputPaddingH: 12,
  publishInputPaddingV: 8,
  publishTitleMarginBottom: 8,

  /* ── F) Publish action bar ── */
  publishActionBar: {
    offsetX: 0,
    offsetY: 8,
    widthScale: 1,
    height: 46,
    borderRadius: 14,
  },
  publishActionBarText: {
    offsetX: 0,
    offsetY: 0,
    fontSize: 15,
    lineHeight: 0,
    letterSpacing: 1.2,
  },
  publishActionBarIcon: {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    size: 20,
  },

  /* ── G) Publish block internal spacing ── */
  publishSpacing: {
    titleToInput: 12,
    inputToButton: 12,
  },
} as const;
