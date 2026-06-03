/**
 * Estrategia de navegación de la app:
 *
 * 1. `pushUnlessCurrent` — evita `router.push` cuando ya estás en la misma ruta
 *    (p. ej. tocar varias veces Racha en la top bar no debe apilar `/streak`).
 *    Usado en flujos donde el push es correcto (community → secundaria).
 *
 * 2. `navigateUnlessCurrent` — versión "inteligente" que aplica:
 *    a) Si target es Comunidad `/(tabs)` desde cualquier secundaria → colapsa
 *       el stack a Comunidad (`router.dismissAll`).
 *    b) Si target es una pantalla MAIN (clan, racha, perfil, frases, etc.) y
 *       NO estamos en Comunidad → colapsa el stack a Comunidad y empuja la
 *       nueva pantalla. Resultado: stack = [Comunidad, nueva].
 *    c) Resto (sub-pantallas, flujos conectados como personal-*, settings-*,
 *       reflection, phrase, etc.) → `router.push` normal.
 *
 *    Usado en topbar, sidebar y cualquier punto donde el usuario salta entre
 *    pantallas principales sin un flujo conectado.
 *
 * No usar en rutas donde el pathname es fijo pero el contenido depende de
 * params (p. ej. `/reflection` + `thoughtId`): `usePathname()` no distingue
 * esos casos.
 */
import { router } from 'expo-router';
import type { Href } from 'expo-router';

// ─── Overlay de carga instantáneo (ver NavLoadingContext) ──────────────────────
// El provider registra aquí su `show` para que la navegación a pantallas
// principales pueda mostrar el spinner ANTES de montar el destino pesado, sin
// que cada call site dependa del contexto.
type NavLoadingShowOpts = { clanId?: string | null; hold?: boolean };
type NavLoadingShow = (opts?: NavLoadingShowOpts) => void;
let navLoadingShow: NavLoadingShow | null = null;

export function registerNavLoadingShow(fn: NavLoadingShow | null): void {
  navLoadingShow = fn;
}

/**
 * Dispara el overlay de carga global. El COLOR del spinner lo decide el propio
 * overlay (siempre el clan del usuario), así que no hace falta pasar clan aquí.
 * Se auto-oculta al cambiar la ruta (relevo con el spinner del destino).
 */
export function showNavLoadingOverlay(): void {
  navLoadingShow?.({ hold: false });
}

/**
 * Variante para Comunidad (Para Ti / Siguiendo): el overlay permanece hasta que
 * la pantalla esté interactiva, NO hasta que cambie la ruta. La ruta cambia al
 * instante pero el feed tarda en hidratarse, así que sin esto el usuario ve la
 * app "congelada" cargando en silencio. Lo cierra CommunityScreen al enfocarse.
 */
export function showNavLoadingOverlayHold(): void {
  navLoadingShow?.({ hold: true });
}

/**
 * Difiere `fn` un par de frames para que el overlay de carga se pinte antes de
 * arrancar el montaje (síncrono y pesado) del destino. Sin esto, el push y el
 * primer render del destino bloquearían el hilo JS en el mismo frame y el
 * spinner no llegaría a verse.
 */
function deferTwoFrames(fn: () => void): void {
  const raf =
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
  if (raf) {
    raf(() => raf(fn));
  } else {
    setTimeout(fn, 16);
  }
}

function normalizeRoutePath(path: string | undefined | null): string {
  if (path == null || path === '') return '/';
  let p = path.split('?')[0].replace(/\/$/, '');
  if (p === '') p = '/';

  const clanMatch = p.match(/^\/clan\/(.+)$/i);
  if (clanMatch) {
    return `/clan/${clanMatch[1].toLowerCase()}`;
  }
  return p;
}

/** Rutas que corresponden a la home de Comunidad (tabs). */
const COMMUNITY_HOME = new Set(['/', '/(tabs)', '/index', '/(tabs)/index']);

function isCommunityHomePath(p: string | undefined): boolean {
  return COMMUNITY_HOME.has(normalizeRoutePath(p));
}

/**
 * Pantallas MAIN: el back debe llevar a Comunidad, no a otra MAIN previa.
 * NO incluye sub-vistas (personal-*, latest-posts, settings-*, account-*),
 * que sí deben mantener su pila conectada con su pantalla padre.
 */
const MAIN_SCREEN_PATTERNS: RegExp[] = [
  /^\/clan\/[^/]+$/,
  /^\/streak$/,
  /^\/racha$/,
  /^\/phrases-domains$/,
  /^\/frases$/,
  /^\/daily-uses$/,
  /^\/my-profile$/,
  /^\/profile\/[^/]+$/,
  /^\/philosophy-profile$/,
  /^\/settings$/,
  /^\/notifications$/,
];

function isMainScreenPath(p: string | undefined): boolean {
  const base = normalizeRoutePath(p);
  return MAIN_SCREEN_PATTERNS.some((r) => r.test(base));
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

/** Colapsa el stack a la raíz (Comunidad). Best-effort: si `dismissAll` no
 *  existe en esta versión de expo-router, hace `replace('/(tabs)')`. */
function collapseToHome(): void {
  const r = router as unknown as { dismissAll?: () => void };
  try {
    if (typeof r.dismissAll === 'function') {
      r.dismissAll();
      return;
    }
  } catch {
    // fall through to replace fallback
  }
  router.replace('/(tabs)' as Href);
}

/**
 * Navegación "inteligente": si vas a una pantalla MAIN desde otra MAIN o desde
 * una sub-vista, colapsa el stack para que el back lleve a Comunidad.
 */
export function navigateUnlessCurrent(
  currentPathname: string | undefined,
  targetHref: string,
): void {
  if (isDuplicateNavigation(currentPathname, targetHref)) return;

  const fromHome = isCommunityHomePath(currentPathname);
  const toHome = isCommunityHomePath(targetHref);
  const toMain = isMainScreenPath(targetHref);

  if (toHome) {
    collapseToHome();
    return;
  }

  if (toMain) {
    // Pantallas principales = montaje pesado. Mostramos el overlay de carga al
    // instante (sobre la pantalla actual ya pintada) y diferimos la navegación
    // un par de frames para que el spinner se pinte antes del montaje.
    showNavLoadingOverlay();
    deferTwoFrames(() => {
      if (!fromHome) collapseToHome();
      router.push(targetHref as Href);
    });
    return;
  }

  router.push(targetHref as Href);
}
