/**
 * Evoconn default theme. Future: clan themes can override accent/card colors.
 *
 * Android displays often look more vivid (panel calibration, vivid mode, different
 * compositing) than typical iOS. We slightly reduce chroma on Android only so
 * accents sit closer to the calmer iPhone perception — tune via ANDROID_COLOR_TUNING.
 */
import { Platform } from 'react-native';

function parseRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Lowers saturation by blending each channel toward the color’s own gray average
 * (keeps approximate brightness better than mixing toward a fixed gray).
 */
export function softenChroma(hex: string, amount: number): string {
  if (amount <= 0) return hex;
  const { r, g, b } = parseRgb(hex);
  const avg = (r + g + b) / 3;
  return rgbToHex(
    r + (avg - r) * amount,
    g + (avg - g) * amount,
    b + (avg - b) * amount,
  );
}

/** Global knobs: increase toward 0.35 for duller Android; 0 disables softening. */
const ANDROID_COLOR_TUNING = {
  /** Main theme accents (neon, purple, etc.) */
  themeChromaPull: 0.26,
  /** Clan card / frame hues */
  clanChromaPull: 0.2,
} as const;

const evoconnColorsBase = {
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
} as const;

function evoconnColorsForPlatform(): typeof evoconnColorsBase {
  if (Platform.OS !== 'android') return evoconnColorsBase;
  const t = ANDROID_COLOR_TUNING.themeChromaPull;
  return {
    ...evoconnColorsBase,
    accent: softenChroma(evoconnColorsBase.accent, t * 0.55),
    neonGreen: softenChroma(evoconnColorsBase.neonGreen, t * 1.25),
    purple: softenChroma(evoconnColorsBase.purple, t * 1.05),
    success: softenChroma(evoconnColorsBase.success, t * 0.5),
    danger: softenChroma(evoconnColorsBase.danger, t * 0.45),
  };
}

export const evoconnColors = evoconnColorsForPlatform();

/** Clan accent colors for post cards and badges (future-ready). */
const clanCardColorsBase: Record<string, string> = {
  nihilista: '#D9CEB3',
  racionalista: '#3B82F6',
  humanista: '#FACC15',
  estoico: '#84CC16',
  cientista: '#529da2',
  epicureo: '#A855F7',
  escéptico: '#64748B',
  existencialista: '#F97316',
};

export const clanCardColors: Record<string, string> =
  Platform.OS === 'android'
    ? Object.fromEntries(
        Object.entries(clanCardColorsBase).map(([k, v]) => [
          k,
          softenChroma(v, ANDROID_COLOR_TUNING.clanChromaPull),
        ]),
      )
    : { ...clanCardColorsBase };

export type ThemeColors = typeof evoconnColorsBase;
