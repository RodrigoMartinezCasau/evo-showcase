/**
 * Editable layout constants for the structured AI response display.
 *
 * Each card (ArgumentCard, QuestionCard, DebateQuoteCard, PublishBlock)
 * pulls values from here so you can tweak spacing/sizes in one place.
 */

/* ──────────────────────────────────────────────
 * PART 1 — Individual gaps between blocks
 * ────────────────────────────────────────────── */

export const AI_RESPONSE_BLOCK_GAPS = {
  postureToCounterpoint: 0.5,
  counterpointToQuestion: 0.5,
  questionToQuote: 0.5,
  quoteToPublish: 0.5,
} as const;

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
    noClan: '#C7FF02',
    nihilista: '#D9CEB3',
    racionalista: '#3F63FF',
    estoico: '#7B8342',
    humanista: '#FFC400',
    existencialista: '#C93A3A',
    trascendentalista: '#C56BEA',
    cientista: '#50D6D3',
    realista: '#A7AAB0',
  },
  counterpoint: {
    noClan: '#7A3CFF',
    nihilista: '#6E6A63',
    racionalista: '#7DB7FF',
    estoico: '#232323',
    humanista: '#B97A2B',
    existencialista: '#f9bc4b',
    trascendentalista: '#D8CF72',
    cientista: '#DFF7F7',
    realista: '#E37B6F',
  },
  question: {
    noClan: '#4f59fe',
    nihilista: '#37343b',
    racionalista: '#defcef',
    estoico: '#868883',
    humanista: '#2d996a',
    existencialista: '#591c2d',
    trascendentalista: '#f9660c',
    cientista: '#298280',
    realista: '#696969',
  },
  quote: {
    noClan: '#4f59fe',
    nihilista: '#37343b',
    racionalista: '#defcef',
    estoico: '#868883',
    humanista: '#2d996a',
    existencialista: '#591c2d',
    trascendentalista: '#f9660c',
    cientista: '#298280',
    realista: '#696969',
  },
  publish: {
    noClan: '#4f59fe',
    nihilista: '#37343b',
    racionalista: '#defcef',
    estoico: '#868883',
    humanista: '#2d996a',
    existencialista: '#591c2d',
    trascendentalista: '#f9660c',
    cientista: '#298280',
    realista: '#696969',
  },
};

/* ──────────────────────────────────────────────
 * PART 3 — Per-clan BACKGROUND colors (per block)
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
  question: {
    noClan: '#0f0f12',
    nihilista: '#0f0f12',
    racionalista: '#0f0f12',
    estoico: '#0f0f12',
    humanista: '#0f0f12',
    existencialista: '#0f0f12',
    trascendentalista: '#0f0f12',
    cientista: '#0f0f12',
    realista: '#0f0f12',
  },
  quote: {
    noClan: '#0f0f12',
    nihilista: '#0f0f12',
    racionalista: '#0f0f12',
    estoico: '#0f0f12',
    humanista: '#0f0f12',
    existencialista: '#0f0f12',
    trascendentalista: '#0f0f12',
    cientista: '#0f0f12',
    realista: '#0f0f12',
  },
  publish: {
    noClan: '#c7ff02',
    nihilista: '#bdb29c',
    racionalista: '#395df2',
    estoico: '#818a41',
    humanista: '#efb318',
    existencialista: '#c93a39',
    trascendentalista: '#cb6ce6',
    cientista: '#54d5cf',
    realista: '#a2a3a8',
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

export function getBlockBorderColor(
  block: string,
  clanId: string | null | undefined,
): string {
  return AI_RESPONSE_BORDER_COLORS[block]?.[clanKey(clanId)] ?? '#3A3A3A';
}

export function getBlockBackgroundColor(
  block: string,
  clanId: string | null | undefined,
): string {
  return AI_RESPONSE_BACKGROUND_COLORS[block]?.[clanKey(clanId)] ?? '#262626';
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
    publish:      { offsetX: -7, offsetY: -3, scale: 2.5, size: 16, marginRight: 8 } as StarEditor,
  },

  /* ── B) Display titles (block headers) ── */
  displayTitles: {
    posture:      { offsetX: -10, offsetY: -15, fontSize: 22, lineHeight: 0 } as TextEditor,
    counterpoint: { offsetX: -10, offsetY: -15, fontSize: 22, lineHeight: 0 } as TextEditor,
    question:     { offsetX: -10, offsetY: -2, fontSize: 20, lineHeight: 0 } as TextEditor,
    quote:        { offsetX: -10, offsetY: -2, fontSize: 20, lineHeight: 0 } as TextEditor,
    publish:      { offsetX: -10, offsetY: -10, fontSize: 20, lineHeight: 0 } as TextEditor,
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

export const DEBATE_POINT_LAYOUT = {
  titleColor: '#FFFFFF',
  bulletColor: '#A0A0A0',
  pointGap: 14,
  bulletIndent: 16,
} as const;

export const DEBATE_SUMMARY_LAYOUT = {
  dividerColor: '#3A3A3A',
  dividerMarginVertical: 14,
  labelColor: '#808080',
  textColor: '#C0C0C0',
} as const;

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
  publishTitle: { offsetX: 0, offsetY: 0, fontSize: 18, lineHeight: 0, color: '#FFFFFF' },
  publishInput: { offsetX: 0, offsetY: 0, fontSize: 13, lineHeight: 0, color: '#FFFFFF' },
  publishInputPlaceholderColor: '#606060',
  publishInputBackground: '#2A2A30',
  publishInputBorderRadius: 10,
  publishInputPaddingH: 12,
  publishInputPaddingV: 8,
  publishTitleMarginBottom: 8,
} as const;
