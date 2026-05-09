/**
 * Fits phrase + optional author text in a fixed box by lowering font sizes from platform maxima.
 * Keeps quote/author size ratio; conservative wrap estimate avoids clipping in Para ti / detalle.
 */

export type PhraseDetailTypography = {
  quoteFontSize: number;
  quoteLineHeight: number;
  authorFontSize: number;
  authorLineHeight: number;
};

function estimateWrappedLines(text: string, maxWidth: number, fontSize: number): number {
  if (!text.trim()) return 0;
  /** Slightly wide chars for bold/italic + Latin metrics — underestimating lines caused rare clipping. */
  const avgCharW = fontSize * 0.72;
  const charsPerLine = Math.max(6, Math.floor(maxWidth / avgCharW));
  const parts = text.split(/\n/);
  let lines = 0;
  for (const p of parts) {
    if (!p.length) {
      lines += 1;
      continue;
    }
    lines += Math.max(1, Math.ceil(p.length / charsPerLine));
  }
  return lines;
}

function estimateBlockHeight(
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): number {
  const n = estimateWrappedLines(text, maxWidth, fontSize);
  /** Extra slack per line + tail for descenders; native Text often measures slightly taller than this model. */
  return n * lineHeight + n * 2 + 6;
}

/**
 * @param quotedBody — already includes curly quotes in measurement if you pass display string
 * @param maxWidth — effective text width (after padding / scale)
 * @param maxHeight — inner panel height available for quote + author + gap
 * @param baseQuoteFontSize / baseQuoteLineHeight / baseAuthorFontSize — from DETAIL_QUOTE_* constants
 */
export function computePhraseDetailTypography(
  quotedBody: string,
  quoteAuthor: string | undefined,
  maxWidth: number,
  maxHeight: number,
  baseQuoteFontSize: number,
  baseQuoteLineHeight: number,
  baseAuthorFontSize: number,
  authorTopGap = 8,
): PhraseDetailTypography {
  const ABS_MIN_QUOTE = 9;
  const w = Math.max(40, maxWidth);
  const h = Math.max(60, maxHeight);

  let quoteFontSize = baseQuoteFontSize;

  while (quoteFontSize >= ABS_MIN_QUOTE) {
    const lhRatio = baseQuoteLineHeight / baseQuoteFontSize;
    const quoteLineHeight = Math.max(Math.round(quoteFontSize * lhRatio), quoteFontSize + 4);
    const sizeRatio = quoteFontSize / baseQuoteFontSize;
    const authorFontSize = Math.max(9, Math.round(baseAuthorFontSize * sizeRatio));
    const authorLineHeight = Math.max(Math.round(authorFontSize * 1.28), authorFontSize + 3);

    const bodyH = estimateBlockHeight(quotedBody, w, quoteFontSize, quoteLineHeight);
    const authorH = quoteAuthor
      ? authorTopGap + estimateBlockHeight(quoteAuthor, w, authorFontSize, authorLineHeight)
      : 0;

    if (bodyH + authorH <= h) {
      return {
        quoteFontSize,
        quoteLineHeight,
        authorFontSize,
        authorLineHeight,
      };
    }
    quoteFontSize -= 1;
  }

  const quoteLineHeight = Math.max(
    Math.round(ABS_MIN_QUOTE * (baseQuoteLineHeight / baseQuoteFontSize)),
    ABS_MIN_QUOTE + 4,
  );
  const authorFontSize = Math.max(9, Math.round(baseAuthorFontSize * (ABS_MIN_QUOTE / baseQuoteFontSize)));
  const authorLineHeight = Math.max(Math.round(authorFontSize * 1.28), authorFontSize + 3);
  return {
    quoteFontSize: ABS_MIN_QUOTE,
    quoteLineHeight,
    authorFontSize,
    authorLineHeight,
  };
}
