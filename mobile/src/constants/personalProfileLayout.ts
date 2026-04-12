/**
 * Centralized layout config for the PERSONAL PROFILE screen.
 * Completely independent from otherProfileLayout.ts.
 * Tweak all positions, sizes, and spacing from this single file.
 */

// ── Top row (contenedor; contador de posts y contadores son capas independientes) ─
export const TOP_ROW_PADDING_HORIZONTAL = 40;
export const TOP_ROW_MIN_HEIGHT = 56;

// ── Contador de publicaciones (reemplaza al botón Seguir) ───────────
export const POSTS_COUNTER_LAYOUT_WIDTH = 200;
export const POSTS_COUNTER_LAYOUT_HEIGHT = 56;
export const POSTS_COUNTER_OFFSET_X = 22;
export const POSTS_COUNTER_OFFSET_Y = 0;
export const POSTS_COUNTER_SCALE = 1;

// ── Contadores seguidores / seguidos ────────────────────────────────
export const FOLLOW_STATS_LAYOUT_WIDTH = 220;
export const FOLLOW_STATS_LAYOUT_HEIGHT = 52;
export const FOLLOW_STATS_OFFSET_X = -85;
export const FOLLOW_STATS_OFFSET_Y = 0;
export const FOLLOW_STATS_SCALE = 1.2;
/** Espacio horizontal entre Seguidores, el divisor y Seguidos (menor = más junto). */
export const FOLLOW_STATS_SEGUIDORES_SEGUIDOS_GAP = 14;

// ── Botón ajustes (reemplaza al botón 3-puntos) ────────────────────
export const SETTINGS_ICON_OFFSET_X = -20;
export const SETTINGS_ICON_OFFSET_Y = -28;
export const SETTINGS_ICON_SCALE = 1.5;

// ── Clan shield position + scale ───────────────────────────────────
export const SHIELD_OFFSET_X = -30;
export const SHIELD_OFFSET_Y = 28;
export const SHIELD_SCALE = 2.3;
export const SHIELD_BASE_SIZE = 62;

// ── Insignia phrase box dimensions ─────────────────────────────────
export const INSIGNIA_BOX_MARGIN_HORIZONTAL = 70;
export const INSIGNIA_BOX_HEIGHT: number | undefined = undefined;
export const INSIGNIA_BOX_OFFSET_X = -50;
export const INSIGNIA_BOX_OFFSET_Y = -15;

// ── Panel porcentajes filosóficos ──────────────────────────────────
export const PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_X = 0;
export const PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_Y = -10;
export const PHILOSOPHY_PERCENTAGES_PANEL_WIDTH: number | undefined = undefined;
export const PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT: number | undefined = undefined;

// ── Username text ──────────────────────────────────────────────────
export const USERNAME_OFFSET_X = 3;
export const USERNAME_OFFSET_Y = -5;
export const USERNAME_FONT_SIZE = 22;

// ── Clan name text ─────────────────────────────────────────────────
export const CLAN_OFFSET_X = 3;
export const CLAN_OFFSET_Y = -6;
export const CLAN_FONT_SIZE = 20;

// ── Rank text ──────────────────────────────────────────────────────
export const RANK_OFFSET_X = 3;
export const RANK_OFFSET_Y = -6;
export const RANK_FONT_SIZE = 20;

// ── Botón compartir (junto al username) ────────────────────────────
export const SHARE_BUTTON_OFFSET_X = -6;
export const SHARE_BUTTON_OFFSET_Y = -4;
export const SHARE_BUTTON_SIZE = 28;

// ── Rank progression block ──────────────────────────────────────────
// A. Full block (outer wrapper – transform only, doesn't push siblings)
export const RANK_BLOCK_OFFSET_X = 0;
export const RANK_BLOCK_OFFSET_Y = 0;
export const RANK_BLOCK_SCALE = 1;

// B. Container (black rounded rectangle)
export const RANK_CONTAINER_WIDTH: number | undefined = undefined; // undefined = auto (fill margins)
export const RANK_CONTAINER_HEIGHT: number | undefined = undefined; // undefined = auto (wrap content)
export const RANK_CONTAINER_RADIUS = 14;
export const RANK_CONTAINER_COLOR = '#000000';
export const RANK_CONTAINER_MARGIN_HORIZONTAL = 20;
export const RANK_CONTAINER_PADDING_VERTICAL = 16;
export const RANK_CONTAINER_PADDING_HORIZONTAL = 18;

// C. Progression bar
export const RANK_BAR_HEIGHT = 10;
export const RANK_BAR_OFFSET_Y = 0;
export const RANK_BAR_BACKGROUND_COLOR = 'rgba(255,255,255,0.12)';
export const RANK_BAR_GRADIENT_START = '#E53935';
export const RANK_BAR_GRADIENT_END = '#FF9800';
export const RANK_BAR_RADIUS = 5;

// D. Current rank text (left)
export const RANK_CURRENT_OFFSET_X = 0;
export const RANK_CURRENT_OFFSET_Y = 0;
export const RANK_CURRENT_FONT_SIZE = 13;
export const RANK_CURRENT_COLOR = '#000000';

// E. Next rank text (right)
export const RANK_NEXT_OFFSET_X = 0;
export const RANK_NEXT_OFFSET_Y = 0;
export const RANK_NEXT_FONT_SIZE = 13;
export const RANK_NEXT_GRADIENT_START = '#E53935';
export const RANK_NEXT_GRADIENT_END = '#FF9800';

// F. Mock progress value (0–1)
export const RANK_PROGRESS_VALUE = 0.6;

// ── "Últimas publicaciones" label ──────────────────────────────────
export const LATEST_POSTS_LABEL_OFFSET_X = 3;
export const LATEST_POSTS_LABEL_OFFSET_Y = 0;
export const LATEST_POSTS_LABEL_FONT_SIZE = 14;
