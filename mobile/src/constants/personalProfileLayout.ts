/**
 * Centralized layout config for the PERSONAL PROFILE screen.
 * Completely independent from otherProfileLayout.ts.
 * Tweak all positions, sizes, and spacing from this single file.
 */
import { Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

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

// ── Icono notificaciones (perfil personal, dentro del row de contadores) ─
/** Posición X del icono (px). Positivo = derecha, negativo = izquierda. */
export const NOTIFICATIONS_ICON_OFFSET_X = 0;
/** Posición Y del icono (px). Positivo = abajo, negativo = arriba. */
export const NOTIFICATIONS_ICON_OFFSET_Y = 0;
/** Escala del SVG respecto al tamaño base (28 px). */
export const NOTIFICATIONS_ICON_SCALE = 1.2;
/**
 * Ajuste del icono de mensajes (Ionicons) para igualar peso visual con la campana SVG
 * en el mismo slot (28 × NOTIFICATIONS_ICON_SCALE px).
 */
export const MESSAGES_ICON_VISUAL_SCALE = 0.82;

// ── Clan shield position + scale ───────────────────────────────────
export const SHIELD_OFFSET_X = -30;
export const SHIELD_OFFSET_Y = 28;
export const SHIELD_SCALE = 2.3;
export const SHIELD_BASE_SIZE = 62;
/**
 * Extra horizontal / vertical nudge for the clan shield (profile header).
 * X: summed with SHIELD_OFFSET_X before the edge clamp (see PersonalIdentityHeader).
 * Y: summed with SHIELD_OFFSET_Y in marginTop (both are applied; SHIELD_OFFSET_Y
 *    had previously been unused in code).
 */
export const SHIELD_RELATIVE_OFFSET_X = 40;
export const SHIELD_RELATIVE_OFFSET_Y = 0;

/** Foto de perfil a la izquierda; @usuario, clan e insignia a la derecha. */
export const PROFILE_HEADER_AVATAR_ON_LEFT = true;
/** Padding horizontal del bloque de identidad (header + frase). */
export const PROFILE_CONTENT_HORIZONTAL_PAD = 20;
/**
 * Borde derecho del escudo (marco + estrellas) respecto al contenedor cuadrado (viewBox 600).
 * Ajusta solo si cambia el SVG; debe ser >= el píxel más a la derecha del badge.
 */
export const PROFILE_AVATAR_SHIELD_RIGHT_EDGE_RATIO = 0.8;
/**
 * Separación mínima universal escudo ↔ textos (px). Nunca se reduce: evita solapes en cualquier dispositivo.
 */
export const PROFILE_AVATAR_TEXT_SAFE_GAP_MIN = 6;
/** @deprecated Usar `PROFILE_AVATAR_TEXT_SAFE_GAP_MIN` y `computeProfileAvatarToTextPadLeft`. */
export const PROFILE_AVATAR_TEXT_GAP = PROFILE_AVATAR_TEXT_SAFE_GAP_MIN;

// ── Insignia phrase box dimensions ─────────────────────────────────
export const INSIGNIA_BOX_MARGIN_HORIZONTAL = 70;
export const INSIGNIA_BOX_HEIGHT: number | undefined = undefined;
/** Desplaza la frase cuando el avatar está a la derecha (layout clásico). */
export const INSIGNIA_BOX_OFFSET_X = -50;
export const INSIGNIA_BOX_OFFSET_Y = 0;

// ── Insignia phrase edit (pencil) icon ─────────────────────────────
export const INSIGNIA_EDIT_ICON_OFFSET_X = -5;
export const INSIGNIA_EDIT_ICON_OFFSET_Y = 0;
export const INSIGNIA_EDIT_ICON_SCALE = 2;
/** Extra padding around the pencil's visual area to keep text clear of it. */
export const INSIGNIA_EDIT_ICON_SAFE_PADDING = -18;

// ── Panel porcentajes filosóficos ──────────────────────────────────
export const PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_X = 0;
export const PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_Y = 0;
export const PHILOSOPHY_PERCENTAGES_PANEL_WIDTH: number | undefined = undefined;
export const PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT: number | undefined = undefined;

// ── Username text ──────────────────────────────────────────────────
export const USERNAME_OFFSET_X = 3;
export const USERNAME_OFFSET_Y = -5;
export const USERNAME_FONT_SIZE = 22;

// ── Clan + rank row (whole line together) ──────────────────────────
export const CLAN_ROW_SCALE = 1;
export const CLAN_ROW_OFFSET_X = USERNAME_OFFSET_X;
/**
 * Hueco vertical @usuario ↔ clan y clan ↔ tarjeta frase insignia (mismo valor en ambos).
 */
export const PROFILE_IDENTITY_SECTION_GAP = 6;
/** Altura mínima de la tarjeta frase insignia (centro del avatar antes del onLayout). */
export const PROFILE_INSIGNIA_CARD_MIN_HEIGHT = 68;
/**
 * Ajuste fino del centro vertical del escudo vs. bloque @usuario + clan + frase (avatar izquierda).
 */
export const PROFILE_AVATAR_BLOCK_CENTER_Y_NUDGE = 0;
/** Sin margen bajo clan: el hueco hasta la frase va en `PROFILE_IDENTITY_SECTION_GAP` (tarjeta). */
export const CLAN_ROW_MARGIN_BOTTOM = 0;

// ── Clan name text ─────────────────────────────────────────────────
export const CLAN_OFFSET_X = 0;
export const CLAN_OFFSET_Y = -3;
export const CLAN_FONT_SIZE = 20;

// ── Rank text ──────────────────────────────────────────────────────
export const RANK_OFFSET_X = -5;
export const RANK_OFFSET_Y = -3;
export const RANK_FONT_SIZE = 18;

// ── Botón compartir (junto al username) ────────────────────────────
export const SHARE_BUTTON_OFFSET_X = -6;
export const SHARE_BUTTON_OFFSET_Y = -4;
export const SHARE_BUTTON_SIZE = 28;
/**
 * Tamaño del carácter ↗ junto al username (perfil personal y perfil ajeno).
 * Valor fijo para que Android e iOS se vean alineados (evita flecha “enana” en Android).
 */
export const PROFILE_SHARE_ARROW_FONT_SIZE = 20;
/** Insignia 100 primeros: 80 % más pequeña que la flecha ↗ (20 % del tamaño). */
export const PROFILE_TESTER_BADGE_SIZE = Math.round(PROFILE_SHARE_ARROW_FONT_SIZE * 0.5);
/** Insignia 100 primeros en perfil personal (más visible). */
export const PROFILE_TESTER_BADGE_SIZE_PERSONAL = Math.round(PROFILE_SHARE_ARROW_FONT_SIZE * 0.8);
/** Reserva horizontal para la insignia (a la derecha de ↗). */
export const PROFILE_TESTER_BADGE_RESERVE = PROFILE_TESTER_BADGE_SIZE + 10;
export const PROFILE_TESTER_BADGE_RESERVE_PERSONAL =
  PROFILE_TESTER_BADGE_SIZE_PERSONAL + 10;

/** Margen interior al exportar PNG: contenido dentro del borde de clan. */
export const PROFILE_SHARE_CAPTURE_PADDING_TOP = 18;
export const PROFILE_SHARE_CAPTURE_PADDING_BOTTOM = 28;
export const PROFILE_SHARE_CAPTURE_PADDING_HORIZONTAL = 8;

// ── Rank progression block ──────────────────────────────────────────
// A. Full block (outer wrapper)
export const RANK_BLOCK_OFFSET_X = 0;
export const RANK_BLOCK_OFFSET_Y = 0;
/** Margen superior del bloque — negativo para acercarlo al elemento de arriba. */
export const RANK_BLOCK_MARGIN_TOP = 0;
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
export const RANK_BAR_BACKGROUND_COLOR = '#222222'; // no rgba — SVG fill crashes with rgba on RN 0.81 re-renders
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
export const PERSONAL_LATEST_POSTS_SPACING = 0;

// ═══════════════════════════════════════════════════════════════════
// ── Bottom blocks (3 compact chips: widgets, friends, saved posts) ─
// ═══════════════════════════════════════════════════════════════════

// Shared container & sizing
export const BOTTOM_BLOCKS_CONTAINER_OFFSET_X = 0;
export const BOTTOM_BLOCKS_CONTAINER_OFFSET_Y = 0;
/** Espacio horizontal entre cada chip. */
export const BOTTOM_BLOCKS_SPACING = 10;
/** Margen horizontal del row de chips — debe coincidir con RANK_CONTAINER_MARGIN_HORIZONTAL. */
export const BOTTOM_BLOCKS_MARGIN_HORIZONTAL = 20;
/** Alto fijo de cada chip; el ancho se ajusta al texto del botón. */
export const BOTTOM_CHIP_HEIGHT = 30;
export const BOTTOM_CHIP_PADDING_HORIZONTAL = 14;
export const BOTTOM_CHIP_BORDER_RADIUS = 10;
export const BOTTOM_CHIP_FONT_SIZE = 11;
export const BOTTOM_CHIP_LETTER_SPACING = 0.6;
/** Margen superior del row de bloques (espaciado interno fijo). */
export const BOTTOM_BLOCKS_MARGIN_TOP = 10;

/** Espacio vertical ENTRE "Últimas publicaciones" y los 3 bloques inferiores.
 *  Reducir → acerca los bloques a la sección. Aumentar → los separa más.
 *  No afecta a ningún otro espaciado del perfil. */
export const PERSONAL_BOTTOM_BLOCKS_SPACING_TOP = -5;

// ── Card background opacities (0 = transparente, 1 = sólido) ───────────────
/**
 * Opacidad del fondo negro de la tarjeta "frase insignia" (perfil personal).
 * 1.0 = negro sólido · 0.0 = completamente transparente.
 */
export const PERSONAL_INSIGNIA_CARD_OPACITY   = 0.5;

/**
 * Opacidad del fondo negro del panel "Pensamiento filosófico" (perfil personal).
 */
export const PERSONAL_PHILOSOPHY_CARD_OPACITY = 1;

/**
 * Opacidad del fondo negro de los 3 chips inferiores:
 * Widgets · Amigos · Guardados (perfil personal).
 */
export const PERSONAL_BOTTOM_BLOCKS_OPACITY   = 1;

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
export const PERSONAL_POSTS_TOTAL_STATS_ITEM_GAP = 34;

/**
 * Base size (px) of each stat icon in the summary row.
 * Uses the same SVGs as the post card stats.
 */
export const PERSONAL_POSTS_TOTAL_STATS_ICON_SIZE = 14;

/**
 * Fine-tune vertical offset of the text label relative to its icon sibling.
 * 0 = perfectly centred; negative = nudge up; positive = nudge down.
 */
export const PERSONAL_POSTS_TOTAL_STATS_TEXT_OFFSET_Y = 1;

// ── Recommended books block (inside BookRecommendationsCard) ────────

/**
 * X/Y translation of the whole 2-book content block inside the card.
 * Does NOT move the card, the title, or the reload icon.
 */
export const RECOMMENDED_BOOKS_OFFSET_X = -65;
export const RECOMMENDED_BOOKS_OFFSET_Y = 0;

/**
 * Uniform scale of the 2-book content block.
 */
export const RECOMMENDED_BOOKS_SCALE = 1;

/**
 * Vertical gap (px) between the two book entries.
 */
export const RECOMMENDED_BOOKS_ITEM_GAP = 12;

// ── Per-stat individual editors (icon + number move/scale together) ──

export const TOTAL_STATS_UPVOTES_OFFSET_X    = 0;
export const TOTAL_STATS_UPVOTES_OFFSET_Y    = 0;
export const TOTAL_STATS_UPVOTES_SCALE       = 1;

export const TOTAL_STATS_DOWNVOTES_OFFSET_X  = 0;
export const TOTAL_STATS_DOWNVOTES_OFFSET_Y  = 0;
export const TOTAL_STATS_DOWNVOTES_SCALE     = 1;

export const TOTAL_STATS_SAVED_OFFSET_X      = 0;
export const TOTAL_STATS_SAVED_OFFSET_Y      = 0;
export const TOTAL_STATS_SAVED_SCALE         = 1;

export const TOTAL_STATS_PERCENTAGE_OFFSET_X = 0;
export const TOTAL_STATS_PERCENTAGE_OFFSET_Y = 0;
export const TOTAL_STATS_PERCENTAGE_SCALE    = 1;

// ── Helpers (avatar izquierda + columna de texto responsive) ───────

const PROFILE_BADGE_MIN_SIZE = 86;
/** Ancho mínimo de la columna @usuario + clan/rango antes de reducir avatar/fuentes. */
const PROFILE_TEXT_COLUMN_MIN_WIDTH = 152;
const PROFILE_USERNAME_MIN_MAX_WIDTH = 88;
/** Escala mínima de @usuario / clan al reducir en pantallas estrechas. */
export const PROFILE_FONT_SCALE_MIN = 0.72;

export type PersonalProfileIdentityLayoutMetrics = {
  avatarSize: number;
  avatarToTextGap: number;
  /** Padding-left del bloque de texto dentro del header (avatar + gap). */
  textColumnPadLeft: number;
  textColumnWidth: number;
  usernameMaxWidth: number;
  usernameFontSize: number;
  usernameLineHeight: number;
  clanFontSize: number;
  clanLineHeight: number;
  rankFontSize: number;
  rankLineHeight: number;
  /** Margen exterior izquierdo (frase insignia alineada con textos). */
  textInsetLeft: number;
  textInsetRight: number;
};

type IdentityLayoutOptions = {
  hideShareButton?: boolean;
};

/**
 * Padding-left de la columna de texto: borde derecho seguro del escudo + hueco anti-solape.
 * Única fuente de verdad para avatar-izquierda (header + frase insignia).
 */
export function computeProfileAvatarToTextPadLeft(avatarSize: number): number {
  const shieldRightEdge = Math.ceil(avatarSize * PROFILE_AVATAR_SHIELD_RIGHT_EDGE_RATIO);
  return shieldRightEdge + PROFILE_AVATAR_TEXT_SAFE_GAP_MIN;
}

/**
 * Reparte ancho entre avatar, hueco mínimo/necesario y columna de texto.
 * Reduce avatar y/o tipografía en pantallas estrechas para evitar solapes y recortes.
 */
export function computePersonalProfileIdentityLayout(
  screenWidth: number,
  options: IdentityLayoutOptions = {},
): PersonalProfileIdentityLayoutMetrics {
  const hideShare = options.hideShareButton ?? true;
  const shareReserve = hideShare
    ? PROFILE_TESTER_BADGE_RESERVE_PERSONAL + 14
    : Math.max(SHARE_BUTTON_SIZE, PROFILE_SHARE_ARROW_FONT_SIZE) +
      PROFILE_TESTER_BADGE_RESERVE +
      14;

  const padH = PROFILE_CONTENT_HORIZONTAL_PAD;
  const innerWidth = Math.max(0, screenWidth - padH * 2);

  if (!PROFILE_HEADER_AVATAR_ON_LEFT) {
    const preferred = Math.round(SHIELD_BASE_SIZE * SHIELD_SCALE);
    const fontScale = 1;
    const usernameFontSize = USERNAME_FONT_SIZE;
    const clanFontSize = CLAN_FONT_SIZE;
    const rankFontSize = RANK_FONT_SIZE;
    return {
      avatarSize: preferred,
      avatarToTextGap: 0,
      textColumnPadLeft: 0,
      textColumnWidth: innerWidth,
      usernameMaxWidth: Math.max(PROFILE_USERNAME_MIN_MAX_WIDTH, innerWidth - shareReserve),
      usernameFontSize,
      usernameLineHeight: Math.ceil(usernameFontSize * 1.3),
      clanFontSize,
      clanLineHeight: Math.ceil(clanFontSize * 1.3),
      rankFontSize,
      rankLineHeight: Math.ceil(rankFontSize * 1.3),
      textInsetLeft: INSIGNIA_BOX_MARGIN_HORIZONTAL,
      textInsetRight: INSIGNIA_BOX_MARGIN_HORIZONTAL,
    };
  }

  const preferredAvatar = Math.round(SHIELD_BASE_SIZE * SHIELD_SCALE);
  const safeGap = PROFILE_AVATAR_TEXT_SAFE_GAP_MIN;
  const padForAvatar = (size: number) => computeProfileAvatarToTextPadLeft(size);

  const maxAvatarByWidth = Math.floor(
    (innerWidth -
      shareReserve -
      PROFILE_TEXT_COLUMN_MIN_WIDTH -
      safeGap) /
      PROFILE_AVATAR_SHIELD_RIGHT_EDGE_RATIO,
  );

  let avatarSize = Math.min(
    preferredAvatar,
    Math.max(PROFILE_BADGE_MIN_SIZE, maxAvatarByWidth),
  );

  let textColumnPadLeft = padForAvatar(avatarSize);
  let textColumnWidth = Math.max(0, innerWidth - textColumnPadLeft);

  while (
    textColumnWidth < PROFILE_TEXT_COLUMN_MIN_WIDTH &&
    avatarSize > PROFILE_BADGE_MIN_SIZE
  ) {
    avatarSize -= 1;
    textColumnPadLeft = padForAvatar(avatarSize);
    textColumnWidth = Math.max(0, innerWidth - textColumnPadLeft);
  }

  const slack = innerWidth - shareReserve - textColumnPadLeft - PROFILE_TEXT_COLUMN_MIN_WIDTH;
  if (slack > 0 && avatarSize < preferredAvatar) {
    const grown = Math.min(preferredAvatar, avatarSize + slack);
    const grownPad = padForAvatar(grown);
    if (grownPad + PROFILE_TEXT_COLUMN_MIN_WIDTH + shareReserve <= innerWidth) {
      avatarSize = grown;
      textColumnPadLeft = grownPad;
      textColumnWidth = Math.max(0, innerWidth - textColumnPadLeft);
    }
  }

  const gap = safeGap;
  const usernameMaxWidth = Math.max(
    PROFILE_USERNAME_MIN_MAX_WIDTH,
    textColumnWidth - shareReserve,
  );

  const widthRatio = textColumnWidth / PROFILE_TEXT_COLUMN_MIN_WIDTH;
  const fontScale = Math.min(1, Math.max(PROFILE_FONT_SCALE_MIN, widthRatio));

  const usernameFontSize = Math.max(16, Math.round(USERNAME_FONT_SIZE * fontScale));
  const clanFontSize = Math.max(14, Math.round(CLAN_FONT_SIZE * fontScale));
  const rankFontSize = Math.max(13, Math.round(RANK_FONT_SIZE * fontScale));

  return {
    avatarSize,
    avatarToTextGap: gap,
    textColumnPadLeft,
    textColumnWidth,
    usernameMaxWidth,
    usernameFontSize,
    usernameLineHeight: Math.ceil(usernameFontSize * 1.3),
    clanFontSize,
    clanLineHeight: Math.ceil(clanFontSize * 1.3),
    rankFontSize,
    rankLineHeight: Math.ceil(rankFontSize * 1.3),
    textInsetLeft: padH + textColumnPadLeft,
    textInsetRight: padH,
  };
}

/** Ancho del avatar en el header del perfil personal (px). */
export function computePersonalProfileAvatarSize(screenWidth: number): number {
  return computePersonalProfileIdentityLayout(screenWidth).avatarSize;
}

/** Margen izquierdo de la frase insignia alineado con @usuario / clan. */
export function computePersonalProfileTextInsetLeft(screenWidth: number): number {
  return computePersonalProfileIdentityLayout(screenWidth).textInsetLeft;
}

export function computePersonalProfileTextInsetRight(screenWidth: number): number {
  return computePersonalProfileIdentityLayout(screenWidth).textInsetRight;
}
