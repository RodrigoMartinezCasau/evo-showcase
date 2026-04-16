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

// ── Insignia phrase edit (pencil) icon ─────────────────────────────
export const INSIGNIA_EDIT_ICON_OFFSET_X = -5;
export const INSIGNIA_EDIT_ICON_OFFSET_Y = 0;
export const INSIGNIA_EDIT_ICON_SCALE = 2;
/** Extra padding around the pencil's visual area to keep text clear of it. */
export const INSIGNIA_EDIT_ICON_SAFE_PADDING = -18;

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
export const RANK_FONT_SIZE = 18;

// ── Botón compartir (junto al username) ────────────────────────────
export const SHARE_BUTTON_OFFSET_X = -6;
export const SHARE_BUTTON_OFFSET_Y = -4;
export const SHARE_BUTTON_SIZE = 28;

// ── Rank progression block ──────────────────────────────────────────
// A. Full block (outer wrapper)
export const RANK_BLOCK_OFFSET_X = 0;
export const RANK_BLOCK_OFFSET_Y = 0;
/** Margen superior del bloque — negativo para acercarlo al elemento de arriba. */
export const RANK_BLOCK_MARGIN_TOP = -25;
/** Margen inferior del bloque — negativo para acercarlo al elemento de abajo. */
export const RANK_BLOCK_MARGIN_BOTTOM = 0;
export const RANK_BLOCK_SCALE = 1;
/** Compresses/expands the entire block on the vertical axis (1 = normal, <1 = thinner, >1 = taller).
 *  Text inside stays the same rendered size — only the visual Y-dimension changes. */
export const RANK_BLOCK_SCALE_Y = 1;

// B. Container (black rounded rectangle — "contorno")
export const RANK_CONTAINER_WIDTH: number | undefined = undefined; // undefined = auto (fill margins)
export const RANK_CONTAINER_HEIGHT: number | undefined = undefined; // undefined = auto (wrap content)
/** Roundness of the black outer container corners. */
export const RANK_CONTAINER_BORDER_RADIUS = 15;
export const RANK_CONTAINER_COLOR = '#000000';
export const RANK_CONTAINER_MARGIN_HORIZONTAL = 20;
/** Espacio vertical interno del contorno negro (reducir = bloque más fino). */
export const RANK_CONTAINER_PADDING_VERTICAL = 6;
export const RANK_CONTAINER_PADDING_HORIZONTAL = 6;
/** Comprime/expande SOLO el contorno negro en vertical (1 = normal, <1 = más fino). No afecta textos. */
export const RANK_CONTAINER_SCALE_Y = 0.85;

// C. Progression bar (la línea/barra interna)
export const RANK_BAR_HEIGHT = 28;
export const RANK_BAR_OFFSET_Y = 0;
export const RANK_BAR_BACKGROUND_COLOR = 'rgba(255,255,255,0.12)';
export const RANK_BAR_GRADIENT_START = '#E53935';
export const RANK_BAR_GRADIENT_END = '#FF9800';
export const RANK_BAR_RADIUS = 10;
/** Controls ONLY the visual thickness of the filled/track line inside the bar area. */
export const RANK_BAR_THICKNESS = 28;
/** Comprime/expande SOLO la barra interna en vertical (1 = normal, <1 = más fina). No afecta textos. */
export const RANK_BAR_SCALE_Y = 0.8;

// D. Current rank text (inside bar, left-aligned)
export const RANK_CURRENT_INSIDE_OFFSET_X = 12;
export const RANK_CURRENT_INSIDE_OFFSET_Y = 0;
export const RANK_CURRENT_INSIDE_SCALE = 1;
export const RANK_CURRENT_FONT_SIZE = 13;

// E. Next rank text (inside bar, right-aligned)
export const RANK_NEXT_INSIDE_OFFSET_X = -12;
export const RANK_NEXT_INSIDE_OFFSET_Y = 0;
export const RANK_NEXT_INSIDE_SCALE = 1;
export const RANK_NEXT_FONT_SIZE = 13;
export const RANK_NEXT_GRADIENT_START = '#E53935';
export const RANK_NEXT_GRADIENT_END = '#FF9800';

// F. Bar gradient → used for text outside the fill as well
export const RANK_TEXT_BLACK_COLOR = '#000000';

// G. Mock progress value (0–1)
export const RANK_PROGRESS_VALUE = 0.6;

// ── "Últimas publicaciones" label ──────────────────────────────────
export const LATEST_POSTS_LABEL_OFFSET_X = 3;
export const LATEST_POSTS_LABEL_OFFSET_Y = 0;
export const LATEST_POSTS_LABEL_FONT_SIZE = 14;

/** Espacio vertical antes de "Últimas publicaciones" — menor = menos hueco con el bloque de arriba. */
export const POSTS_SECTION_PADDING_TOP = 0;

/** Espacio vertical ENTRE el panel de porcentajes filosóficos y "Últimas publicaciones".
 *  Reducir → acerca la sección al panel. Aumentar → separa más.
 *  No afecta a ningún otro espaciado del perfil. */
export const PERSONAL_LATEST_POSTS_SPACING = -20;

// ═══════════════════════════════════════════════════════════════════
// ── Bottom blocks (3 squares: icon switch, friends, saved posts) ──
// ═══════════════════════════════════════════════════════════════════

// Shared container & sizing
export const BOTTOM_BLOCKS_CONTAINER_OFFSET_X = 0;
export const BOTTOM_BLOCKS_CONTAINER_OFFSET_Y = 0;
/** Espacio horizontal entre cada bloque. */
export const BOTTOM_BLOCKS_SPACING = 16;
/** Tamaño (ancho × alto) de cada bloque cuadrado. */
export const BOTTOM_BLOCK_SIZE = 120;
export const BOTTOM_BLOCK_BORDER_RADIUS = 18;
/** Margen horizontal del row de bloques. */
export const BOTTOM_BLOCKS_MARGIN_HORIZONTAL = 20;
/** Margen superior del row de bloques (espaciado interno fijo). */
export const BOTTOM_BLOCKS_MARGIN_TOP = 10;

/** Espacio vertical ENTRE "Últimas publicaciones" y los 3 bloques inferiores.
 *  Reducir → acerca los bloques a la sección. Aumentar → los separa más.
 *  No afecta a ningún otro espaciado del perfil. */
export const PERSONAL_BOTTOM_BLOCKS_SPACING_TOP = -5;

// ── Personal posts full-grid screen (PersonalPostsScreen) ──────────

/**
 * Scale multiplier applied to each card's width in the full posts grid.
 * 1 = fill the two columns evenly. Values < 1 make cards narrower.
 */
export const PERSONAL_POSTS_CARD_SCALE = 1;

/**
 * Horizontal gap (px) between the two card columns in the posts grid.
 */
export const PERSONAL_POSTS_COLUMN_GAP = 10;

/**
 * Vertical gap (px) between rows in the posts grid.
 */
export const PERSONAL_POSTS_ROW_GAP = 10;

// ── Post three-dots menu icon ────────────────────────────────────────

/**
 * Horizontal fine-tune offset (px) for the ⋯ icon inside the card meta row.
 * Positive = right, negative = left.
 */
export const PERSONAL_POST_MENU_DOTS_OFFSET_X = 0;

/**
 * Vertical fine-tune offset (px) for the ⋯ icon.
 * Positive = down, negative = up.
 */
export const PERSONAL_POST_MENU_DOTS_OFFSET_Y = 0;

/**
 * Visual scale of the ⋯ icon. 1 = native Ionicons size.
 */
export const PERSONAL_POST_MENU_DOTS_SCALE = 1;

/**
 * Additional scale multiplier applied to the stats bar (icons + numbers)
 * ONLY when the card is displayed in the full posts grid (PersonalPostsScreen).
 * Does NOT affect the "Últimas publicaciones" horizontal slider.
 * 1 = same size as the slider cards. >1 = larger stats.
 */
export const PERSONAL_POSTS_GRID_STATS_SCALE = 0.85;

// Block 1 — App icon / Clan star  (container-level position)
export const ICON_SWITCH_OFFSET_X = 0;
export const ICON_SWITCH_OFFSET_Y = 0;
export const ICON_SWITCH_SCALE = 1;
/** Estrella del clan DENTRO del cuadrado — posición y escala independientes del contenedor. */
export const APP_ICON_STAR_OFFSET_X = 0;
export const APP_ICON_STAR_OFFSET_Y = 10;
export const APP_ICON_STAR_SCALE = 3.8;

// ── Personal posts total-stats summary row ──────────────────────────

/**
 * X/Y translation of the total-stats block as a whole (relative to its
 * natural position above the posts grid).
 */
export const PERSONAL_POSTS_TOTAL_STATS_OFFSET_X = 0;
export const PERSONAL_POSTS_TOTAL_STATS_OFFSET_Y = 0;

/**
 * Uniform scale of the entire total-stats block.
 * 1 = natural size. Increase to make icons + numbers larger.
 */
export const PERSONAL_POSTS_TOTAL_STATS_SCALE = 1;

/**
 * Horizontal gap between each stat item (icon+number pair).
 */
export const PERSONAL_POSTS_TOTAL_STATS_ITEM_GAP = 32;

/**
 * Base size (px) of each stat icon in the summary row.
 * Uses the same SVGs as the post card stats.
 */
export const PERSONAL_POSTS_TOTAL_STATS_ICON_SIZE = 22;

/**
 * Fine-tune vertical offset of the text label relative to its icon sibling.
 * 0 = perfectly centred; negative = nudge up; positive = nudge down.
 */
export const PERSONAL_POSTS_TOTAL_STATS_TEXT_OFFSET_Y = 1;

// Block 2 — Friends display
export const FRIENDS_BLOCK_OFFSET_X = 0;
export const FRIENDS_BLOCK_OFFSET_Y = 0;
export const FRIENDS_BLOCK_SCALE = 1;

// Block 3 — Saved posts  (container-level position)
export const SAVED_BLOCK_OFFSET_X = 0;
export const SAVED_BLOCK_OFFSET_Y = 0;
export const SAVED_BLOCK_SCALE = 1;
/** Texto "GUARDADOS" dentro del cuadrado — solo posición. */
export const SAVED_LABEL_OFFSET_X = 0;
export const SAVED_LABEL_OFFSET_Y = -2;
/** Icono guardados DENTRO del cuadrado — posición y escala independientes del contenedor. */
export const SAVED_ICON_OFFSET_X = 0;
export const SAVED_ICON_OFFSET_Y = 0;
export const SAVED_ICON_SCALE = 2.8;
