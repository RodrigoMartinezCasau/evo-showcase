/**
 * Layout editors for the clan-banner SVGs that replace text labels
 * in philosophy percentage rows.
 *
 * Two independent sets:
 *  - "profile"   → PersonalPhilosophyPanel + PhilosophyPercentagesPanel
 *  - "expanded"  → ClanPercentagesTable (detailed philosophy screen)
 */

// ─── Profile panels (Personal + OtherUser) ───────────────────────────────────

/** Uniform scale applied to every banner icon in profile percentage panels. */
export const PHILOSOPHY_BANNER_SCALE = 3.8;

/** Horizontal nudge (px) applied to every banner icon in profile panels. */
export const PHILOSOPHY_BANNER_OFFSET_X = 0;

/** Vertical nudge (px) applied to every banner icon in profile panels. */
export const PHILOSOPHY_BANNER_OFFSET_Y = 25;

// ─── Expanded detail screen ───────────────────────────────────────────────────

/** Uniform scale applied to every banner icon in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_BANNER_SCALE = 3.8;

/** Horizontal nudge (px) for banners in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_BANNER_OFFSET_X = 0;

/** Vertical nudge (px) for banners in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_BANNER_OFFSET_Y = 25;

// ─── Container padding ────────────────────────────────────────────────────────

/** Space between the top edge of the black container and the title (profile panels). */
export const PHILOSOPHY_CONTAINER_PADDING_TOP = 20;

/** Space between the last row and the bottom edge of the black container (profile panels). */
export const PHILOSOPHY_CONTAINER_PADDING_BOTTOM = 14;

/** Horizontal padding (left + right) of the black container in profile panels. */
export const PHILOSOPHY_CONTAINER_PADDING_HORIZONTAL = 16;

/** Espacio entre la fila del título ("Pensamiento filosófico") y la primera barra de %. */
export const PHILOSOPHY_TITLE_TO_ROWS_GAP = 12;

/** Space between the top edge of the black container and the title (expanded table). */
export const EXPANDED_PHILOSOPHY_CONTAINER_PADDING_TOP = 20;

/** Space between the last row and the bottom edge of the black container (expanded table). */
export const EXPANDED_PHILOSOPHY_CONTAINER_PADDING_BOTTOM = 14;

/** Horizontal padding of the black container in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_CONTAINER_PADDING_HORIZONTAL = 16;

/** Espacio entre el título y la primera fila de % (distribución completa). */
export const EXPANDED_PHILOSOPHY_TITLE_TO_ROWS_GAP = 12;

// ─── Row spacing ─────────────────────────────────────────────────────────────

/**
 * Vertical gap (px) between each percentage row in profile panels
 * (PersonalPhilosophyPanel + PhilosophyPercentagesPanel).
 * Reduce to tighten rows; increase to loosen them.
 */
export const PHILOSOPHY_ROW_GAP = 4;

/**
 * Vertical gap (px) between each percentage row in the expanded
 * philosophy detail table (ClanPercentagesTable).
 */
export const EXPANDED_PHILOSOPHY_ROW_GAP = 4;

// ─── Row height clamp ─────────────────────────────────────────────────────────

/**
 * Visible height (px) of each percentage row in profile panels.
 * The banner SVG renders at full scale but the row clips to this height,
 * keeping the label centered. Shrink this to reduce the black container
 * without changing banner scale, bar, or percentage text.
 * Set to `undefined` to let the row size itself naturally.
 */
export const PHILOSOPHY_ROW_HEIGHT: number | undefined = 38;

/**
 * Visible height (px) of each row in the expanded philosophy table.
 */
export const EXPANDED_PHILOSOPHY_ROW_HEIGHT: number | undefined = 38;

// ─── Bar gradient clan colors ─────────────────────────────────────────────────

/**
 * Right-end color for each clan's progress bar gradient (left = white).
 * Matches the clan's primary identity color.
 */
export const PHILOSOPHY_BAR_CLAN_COLORS: Record<string, string> = {
  nihilista:        '#bdb29c',
  cientista:        '#529da2',
  estoico:          '#818a41',
  existencialista:  '#c93a39',
  racionalista:     '#395df2',
  humanista:        '#efb318',
  realista:         '#a2a3a8',
  trascendentalista:'#8d61d1',
};

/** Fallback gradient end color when clanId is unknown. */
export const PHILOSOPHY_BAR_DEFAULT_COLOR = '#FFFFFF';

// ─── Clan name chips (filas de % — sustituyen estandartes SVG) ───────────────

/** Ancho fijo de cada cajita de pensamiento filosófico. */
export const PHILOSOPHY_CLAN_CHIP_WIDTH = 108;

/** Alto fijo de cada cajita (todas iguales). */
export const PHILOSOPHY_CLAN_CHIP_HEIGHT = 34;

/** Radio de esquina de la cajita (estilo frase insignia). */
export const PHILOSOPHY_CLAN_CHIP_RADIUS = 8;

/** Longitud del brazo del reborde Apple en la cajita. */
export const PHILOSOPHY_CLAN_CHIP_RIM_ARM = 16;

// ─── Base size (shared) ───────────────────────────────────────────────────────

/**
 * Base pixel side-length of the square banner icon before any scale is applied.
 * The viewBox of all banner SVGs is 600×600 (square).
 */
export const PHILOSOPHY_BANNER_BASE_SIZE = 30;
