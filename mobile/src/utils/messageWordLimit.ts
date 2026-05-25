/** Límites silenciosos en mensajes de reflexión / frase. */
export const MESSAGE_MAX_WORDS = 3000;
export const MESSAGE_MAX_CHARS = 15000;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function clampToWordLimit(
  text: string,
  maxWords: number = MESSAGE_MAX_WORDS,
): string {
  if (!text) return text;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}

/** Recorta por palabras y caracteres (sin avisar al usuario). */
export function clampMessageInput(
  text: string,
  maxWords: number = MESSAGE_MAX_WORDS,
  maxChars: number = MESSAGE_MAX_CHARS,
): string {
  if (!text) return text;
  let out = text.length > maxChars ? text.slice(0, maxChars) : text;
  out = clampToWordLimit(out, maxWords);
  if (out.length > maxChars) out = out.slice(0, maxChars);
  return out;
}

/** Transcripción de voz que cabe sobre el texto existente. */
export function truncateTranscriptToFit(
  baseText: string,
  transcript: string,
  maxWords: number = MESSAGE_MAX_WORDS,
  maxChars: number = MESSAGE_MAX_CHARS,
): string {
  const base = baseText.trim();
  const remainingWords = maxWords - countWords(base);
  if (remainingWords <= 0) return '';

  const sep = base ? 1 : 0;
  const remainingChars = maxChars - base.length - sep;
  if (remainingChars <= 0) return '';

  const t = transcript.trim();
  if (!t) return '';

  let words = t.split(/\s+/);
  if (words.length > remainingWords) words = words.slice(0, remainingWords);
  let out = words.join(' ');
  if (out.length > remainingChars) out = out.slice(0, remainingChars).trimEnd();
  return out;
}

export function messageLimitReached(
  text: string,
  maxWords: number = MESSAGE_MAX_WORDS,
  maxChars: number = MESSAGE_MAX_CHARS,
): boolean {
  return countWords(text) >= maxWords || text.length >= maxChars;
}
