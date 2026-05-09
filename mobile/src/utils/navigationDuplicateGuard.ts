/**
 * Evita `router.push` cuando ya estamos en la misma ruta
 * (p. ej. tocar varias veces Racha en la top bar no debe apilar copias de /streak).
 *
 * No usar en rutas donde el pathname es fijo pero el contenido depende de params
 * (p. ej. `/reflection` + `thoughtId`): `usePathname()` no distingue esos casos.
 */
import { router } from 'expo-router';
import type { Href } from 'expo-router';

function normalizeRoutePath(path: string | undefined | null): string {
  if (path == null || path === '') return '/';
  let p = path.replace(/\/$/, '');
  if (p === '') p = '/';

  const clanMatch = p.match(/^\/clan\/(.+)$/i);
  if (clanMatch) {
    return `/clan/${clanMatch[1].toLowerCase()}`;
  }
  return p;
}

/** Rutas que corresponden a la home de Comunidad (tabs). */
const COMMUNITY_HOME = new Set(['/', '/(tabs)', '/index', '/(tabs)/index']);

function isCommunityHomePath(p: string): boolean {
  return COMMUNITY_HOME.has(normalizeRoutePath(p));
}

/**
 * `targetHref` debe ser la ruta concreta (p. ej. `/clan/nihilista`), no el patrón dinámico.
 */
export function isDuplicateNavigation(
  currentPathname: string | undefined,
  targetHref: string,
): boolean {
  const cur = normalizeRoutePath(currentPathname);
  const tgt = normalizeRoutePath(targetHref);
  if (cur === tgt) return true;
  if (isCommunityHomePath(cur) && isCommunityHomePath(tgt)) return true;
  return false;
}

export function pushUnlessCurrent(currentPathname: string | undefined, targetHref: string): void {
  if (isDuplicateNavigation(currentPathname, targetHref)) return;
  router.push(targetHref as Href);
}
