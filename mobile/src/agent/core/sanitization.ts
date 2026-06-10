/**
 * Saneado de datos sensibles antes del LLM (U3).
 *
 * Última barrera de defensa: aunque cada pantalla cura su contexto, una
 * pantalla nueva mal curada podría filtrar emails o teléfonos al proveedor
 * de IA. Esta función redacta patrones sensibles del contexto que la app
 * añade por su cuenta. NUNCA se aplica a la transcripción del usuario: lo
 * que él dice voluntariamente puede contener datos que necesita procesar.
 */

export type RedactionType = 'email' | 'iban' | 'card' | 'phone' | 'dni';

export interface SanitizationResult {
  /** Texto con los patrones sensibles sustituidos por [REDACTADO_*]. */
  sanitized: string;
  /** Tipos de redacción aplicados (sin los valores), para instrumentación. */
  redactions: RedactionType[];
}

/**
 * Orden de aplicación importa: IBAN antes que tarjeta/teléfono (contiene 22
 * dígitos que de otro modo matchearían como tarjeta), tarjeta antes que
 * teléfono (16 dígitos también encajan en el patrón de teléfono).
 */
const PATTERNS: Array<{ type: RedactionType; regex: RegExp; replacement: string }> = [
  {
    type: 'email',
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: '[REDACTADO_EMAIL]',
  },
  {
    type: 'iban',
    // IBAN español: ES + 2 dígitos de control + 20 dígitos (con separadores opcionales).
    regex: /\bES[\s-]?\d{2}(?:[\s-]?\d){20}\b/g,
    replacement: '[REDACTADO_IBAN]',
  },
  {
    type: 'card',
    // 13-19 dígitos con separadores opcionales (espacio/guion).
    regex: /\b\d(?:[ -]?\d){12,18}\b/g,
    replacement: '[REDACTADO_TARJETA]',
  },
  {
    type: 'phone',
    // Prefijo internacional opcional + 9-14 dígitos con separadores opcionales.
    regex: /(?:\+\d{1,3}[\s.-]?)?\b\d(?:[\s.-]?\d){8,13}\b/g,
    replacement: '[REDACTADO_TELÉFONO]',
  },
  {
    type: 'dni',
    // DNI español: 8 dígitos + letra.
    regex: /\b\d{8}[A-Za-z]\b/g,
    replacement: '[REDACTADO_DNI]',
  },
];

/**
 * Redacta emails, teléfonos, tarjetas, IBAN y DNI del texto.
 * Devuelve el texto saneado y la lista de tipos redactados (sin valores).
 */
export function sanitizeForLLM(text: string): SanitizationResult {
  let sanitized = text;
  const redactions: RedactionType[] = [];
  for (const { type, regex, replacement } of PATTERNS) {
    // El prefijo "+" del teléfono puede quedar fuera del \b; limpiarlo junto al match.
    if (regex.test(sanitized)) {
      redactions.push(type);
      sanitized = sanitized.replace(regex, replacement);
    }
    regex.lastIndex = 0;
  }
  // "+[REDACTADO_TELÉFONO]" → el "+" suelto delata el prefijo; absorberlo.
  sanitized = sanitized.replace(/\+\s?\[REDACTADO_TELÉFONO\]/g, '[REDACTADO_TELÉFONO]');
  return { sanitized, redactions };
}
