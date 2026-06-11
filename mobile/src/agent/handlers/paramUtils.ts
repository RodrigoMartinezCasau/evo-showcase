/** Extrae el primer string no vacío de params probando alias (el LLM a veces usa otro nombre). */
export function pickStringParam(
  params: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = params[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}
