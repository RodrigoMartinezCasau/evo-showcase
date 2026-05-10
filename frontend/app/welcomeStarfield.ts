/** Misma lógica que `StarFieldBackground.tsx` en la app (posiciones deterministas). */
export const WELCOME_STAR_COUNT = 28

export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

export const WELCOME_STARS = Array.from({ length: WELCOME_STAR_COUNT }, (_, i) => ({
  leftPct: pseudoRandom(i * 2 + 1) * 100,
  topPct: pseudoRandom(i * 2 + 2) * 100,
  sizePx: 1.5 + pseudoRandom(i * 3 + 7) * 1.5,
  delayMs: Math.floor(pseudoRandom(i * 4 + 11) * 1800),
}))
