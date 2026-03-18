import { evoconnColors, clanCardColors, type ThemeColors } from './colors'

/** Default app theme = Evoconn. Future: swap for clan theme. */
export const defaultTheme = {
  ...evoconnColors,
  clanCardColors,
}

export type AppTheme = ThemeColors & { clanCardColors: typeof clanCardColors }

export function getClanCardColor(clanId: string | null | undefined): string {
  return clanCardColors[clanId] ?? evoconnColors.accent
}
