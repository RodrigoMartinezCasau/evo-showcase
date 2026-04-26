/**
 * Evoconn default theme. Future: clan themes can override accent/card colors.
 */
export const evoconnColors = {
  background: '#0B0B0F',
  card: '#15151A',
  accent: '#D9CEB3',
  text: '#FFFFFF',
  muted: '#9CA3AF',
  border: '#27272F',
  purple: '#7000ff',
  neonGreen: '#c7ff02',
  danger: '#EF4444',
  success: '#22C55E',
  save: '#737373',
} as const

/** Clan accent colors for post cards and badges (future-ready). */
export const clanCardColors: Record<string, string> = {
  nihilista: '#D9CEB3',
  racionalista: '#3B82F6',
  humanista: '#FACC15',
  estoico: '#84CC16',
  cientista: '#529da2',
  epicureo: '#A855F7',
  escéptico: '#64748B',
  existencialista: '#F97316',
}

export type ThemeColors = typeof evoconnColors
