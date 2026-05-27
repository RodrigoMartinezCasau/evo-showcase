/**
 * Devuelve un string corto en español indicando cuánto tiempo ha pasado.
 *
 *   "ahora"
 *   "hace 5 min"
 *   "hace 3 h"
 *   "hace 2 d"
 *   "hace 3 sem"
 *   "hace 4 meses"
 *   "hace 2 años"
 *
 * Usar para timestamps de posts y comentarios.
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';

  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'ahora';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'ahora';

  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `hace ${day} d`;

  const week = Math.floor(day / 7);
  if (week < 5) return `hace ${week} sem`;

  const month = Math.floor(day / 30);
  if (month < 12) return month === 1 ? 'hace 1 mes' : `hace ${month} meses`;

  const year = Math.floor(day / 365);
  return year === 1 ? 'hace 1 año' : `hace ${year} años`;
}
