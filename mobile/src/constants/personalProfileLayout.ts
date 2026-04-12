/**
 * Centralized layout config for the PERSONAL PROFILE screen.
 * Completely independent from otherProfileLayout.ts.
 * Tweak all positions, sizes, and spacing from this single file.
 */

// ── Follow row (contenedor; botón y contadores son capas independientes) ─
export const FOLLOW_ROW_PADDING_HORIZONTAL = 40;
export const FOLLOW_ROW_MIN_HEIGHT = 56;

// ── Botón Seguir / Siguiendo (caja de layout fija; solo transform mueve/escala) ─
export const FOLLOW_BUTTON_LAYOUT_WIDTH = 200;
export const FOLLOW_BUTTON_LAYOUT_HEIGHT = 56;
export const FOLLOW_BUTTON_OFFSET_X = 22;
export const FOLLOW_BUTTON_OFFSET_Y = 0;
export const FOLLOW_BUTTON_SCALE = 1;

export const FOLLOW_BUTTON_PLUS_OFFSET_X = -15;
export const FOLLOW_BUTTON_PLUS_OFFSET_Y = 0;
export const FOLLOW_BUTTON_PLUS_SCALE = 0.8;

export const FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_X = -12;
export const FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_Y = 0;
export const FOLLOW_BUTTON_SEGUIR_TEXT_SCALE = 1;

// ── Contadores seguidores / seguidos ────────────────────────────────
export const FOLLOW_STATS_LAYOUT_WIDTH = 220;
export const FOLLOW_STATS_LAYOUT_HEIGHT = 52;
export const FOLLOW_STATS_OFFSET_X = -70;
export const FOLLOW_STATS_OFFSET_Y = 0;
export const FOLLOW_STATS_SCALE = 1.2;

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
export const CLAN_OFFSET_Y = -3;
export const CLAN_FONT_SIZE = 20;

// ── Rank text ──────────────────────────────────────────────────────
export const RANK_OFFSET_X = 3;
export const RANK_OFFSET_Y = -3;
export const RANK_FONT_SIZE = 20;

// ── Botón 3-puntos (acciones avanzadas) ────────────────────────────
export const THREE_DOTS_OFFSET_X = -5;
export const THREE_DOTS_OFFSET_Y = 5;
export const THREE_DOTS_SIZE = 50;

// ── Botón compartir (junto al username) ────────────────────────────
export const SHARE_BUTTON_OFFSET_X = -7;
export const SHARE_BUTTON_OFFSET_Y = -5;
export const SHARE_BUTTON_SIZE = 28;

// ── "Últimas publicaciones" label ──────────────────────────────────
export const LATEST_POSTS_LABEL_OFFSET_X = 3;
export const LATEST_POSTS_LABEL_OFFSET_Y = 0;
export const LATEST_POSTS_LABEL_FONT_SIZE = 14;
