/**
 * Normaliza el texto de la frase antes de guardarlo en `CommunityPost.body` (sin comillas envolventes).
 * Quita comillas rectas/curvas/smart repetidas en los bordes.
 */
export function normalizePhraseInnerForPublish(raw: string): string {
  let s = raw.trim();
  if (!s) return '';

  const stripPair = (str: string): string | null => {
    const pairs: [string, string][] = [
      ['"', '"'],
      ['\u201C', '\u201D'],
      ['\u2018', '\u2019'],
      ['«', '»'],
      ['\u201E', '\u201D'],
    ];
    for (const [a, b] of pairs) {
      if (str.startsWith(a) && str.endsWith(b)) {
        return str.slice(a.length, str.length - b.length).trim();
      }
    }
    return null;
  };

  let next = stripPair(s);
  while (next !== null) {
    s = next;
    next = stripPair(s);
  }

  return s.replace(/\s+/g, ' ').trim();
}

/** Texto mostrado en feed/detalle: una sola pareja de comillas ASCII alrededor del cuerpo ya normalizado. */
export function formatPhraseBodyForDisplay(innerNormalized: string): string {
  const safe = innerNormalized.replace(/"/g, "'");
  return `"${safe}"`;
}
