/**
 * Editable layout constants for the structured AI response display.
 *
 * Each card (ArgumentCard, QuestionCard, QuoteCard, PublishBlock)
 * pulls values from here so you can tweak spacing/sizes in one place.
 */

export const DEBATE_CARD_LAYOUT = {
  /** Shared background for all cards. */
  backgroundColor: '#262626',
  borderRadius: 16,
  borderWidth: 2,
  /** Vertical gap between consecutive cards. */
  cardGap: 16,
  paddingHorizontal: 16,
  paddingVertical: 16,
} as const;

export const DEBATE_HEADER_LAYOUT = {
  /** Star icon size (fontSize). */
  starSize: 16,
  /** Label font size ("TU POSTURA", etc.). */
  labelSize: 13,
  letterSpacing: 1.2,
  marginBottom: 14,
} as const;

export const DEBATE_POINT_LAYOUT = {
  /** Numbered title (e.g. "1. TITULO"). */
  titleSize: 14,
  titleColor: '#FFFFFF',
  /** Bullet text. */
  bulletSize: 14,
  bulletColor: '#A0A0A0',
  bulletLineHeight: 20,
  /** Vertical space between points. */
  pointGap: 14,
  /** Left indent for bullets under a title. */
  bulletIndent: 16,
} as const;

export const DEBATE_SUMMARY_LAYOUT = {
  /** Divider above "RESUMEN RÁPIDO". */
  dividerColor: '#3A3A3A',
  dividerMarginVertical: 14,
  labelSize: 11,
  labelColor: '#808080',
  textSize: 13,
  textColor: '#C0C0C0',
  textLineHeight: 19,
} as const;

export const DEBATE_QUESTION_LAYOUT = {
  textSize: 15,
  textColor: '#E0E0E0',
  textLineHeight: 22,
  /** Softer border for the question card. */
  borderColor: '#3A3A3A',
} as const;

export const DEBATE_QUOTE_LAYOUT = {
  textSize: 15,
  textColor: '#FFFFFF',
  textLineHeight: 22,
  /** Red left accent bar. */
  accentWidth: 4,
  accentColor: '#C93A3A',
  /** "NUEVA FRASE DESBLOQUEADA" label. */
  badgeFontSize: 11,
  badgeColor: '#C7FF02',
  /** "AÑADIR COMO WIDGET" button. */
  buttonFontSize: 12,
  buttonColor: '#C7FF02',
  buttonBorderColor: '#C7FF02',
  buttonBorderRadius: 8,
  buttonPaddingH: 12,
  buttonPaddingV: 6,
  borderColor: '#3A3A3A',
} as const;

export const DEBATE_PUBLISH_LAYOUT = {
  backgroundColor: '#1E1E24',
  borderRadius: 16,
  titleSize: 18,
  titleColor: '#C7FF02',
  inputPlaceholderColor: '#606060',
  inputBackgroundColor: '#2A2A30',
  inputBorderRadius: 10,
  inputFontSize: 14,
  inputPaddingH: 14,
  inputPaddingV: 10,
} as const;
