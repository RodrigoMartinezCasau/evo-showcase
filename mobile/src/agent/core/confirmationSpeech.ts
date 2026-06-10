/**
 * Detección de respuestas afirmativas/negativas para la confirmación por voz
 * (Sprint 4). Lógica pura y testeable: el hook del asistente la usa para
 * decidir si una transcripción corta confirma, cancela o es ambigua.
 */

export const AFFIRMATIVE_WORDS = [
  'si',
  'sí',
  'confirma',
  'confirmo',
  'adelante',
  'hazlo',
  'vale',
  'ok',
  'okey',
  'correcto',
  'exacto',
  'claro',
  'efectivamente',
  'dale',
];

export const NEGATIVE_WORDS = [
  'no',
  'cancela',
  'cancelar',
  'cancelalo',
  'cancélalo',
  'para',
  'espera',
  'detente',
  'mejor no',
  'olvidalo',
  'olvídalo',
  'nada',
];

/** Normaliza para comparar: minúsculas, sin signos, espacios colapsados. */
function normalizeConfirmationText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?¡¿"'«»()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsWord(normalized: string, word: string): boolean {
  return (
    normalized === word ||
    normalized.startsWith(`${word} `) ||
    normalized.endsWith(` ${word}`) ||
    normalized.includes(` ${word} `)
  );
}

export function isAffirmative(text: string): boolean {
  const normalized = normalizeConfirmationText(text);
  if (!normalized) return false;
  return AFFIRMATIVE_WORDS.some((w) => containsWord(normalized, w));
}

export function isNegative(text: string): boolean {
  const normalized = normalizeConfirmationText(text);
  if (!normalized) return false;
  return NEGATIVE_WORDS.some((w) => containsWord(normalized, w));
}

export type ConfirmationReply = 'affirmative' | 'negative' | 'ambiguous';

/**
 * Clasifica una transcripción de confirmación. La negación gana al empate
 * ("no, espera, vale" → negative): ante la duda, NUNCA ejecutar.
 * Texto vacío o sin señal clara → ambiguous (se repregunta una vez).
 */
export function classifyConfirmationReply(text: string): ConfirmationReply {
  const negative = isNegative(text);
  const affirmative = isAffirmative(text);
  if (negative) return 'negative';
  if (affirmative) return 'affirmative';
  return 'ambiguous';
}
