/**
 * Minimal i18n: current locale fixed to "es". Use t(key) for UI strings.
 * For a future English version, add en.ts and switch by locale.
 */
import { es, type I18nKeys } from './es'

const locale = 'es' as const
const dict = es

export function t(key: I18nKeys): string {
  return dict[key] ?? key
}

export { es }
export type { I18nKeys }
