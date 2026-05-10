import { Platform } from 'react-native';

export const BOTTOM_BAR_LAYOUT = {
  /** Move the whole bar up/down (positive = up, negative = closer to bottom edge). iOS. */
  BOTTOM_BAR_BOTTOM_OFFSET: -10,
  /** Android: anclada al borde inferior del layout; el hueco sobre la nav del sistema viene de `paddingBottom: insets.bottom`. */
  BOTTOM_BAR_BOTTOM_OFFSET_ANDROID: 0,

  BOTTOM_BAR_HORIZONTAL_PADDING: 0,
  BOTTOM_BAR_INTERNAL_PADDING_VERTICAL: 0,

  /** Used for list padding so content never hides under the bar. */
  BOTTOM_BAR_HEIGHT: 52,
  /** Android: fila de tabs más baja; debe coincidir con `minHeight` de `BottomCommunityTabs` (`styles.bar`). */
  BOTTOM_BAR_HEIGHT_ANDROID: 46,

  /** Debe coincidir con `paddingBottom` de la fila en `BottomCommunityTabs` (`styles.bar`). */
  BOTTOM_BAR_ROW_PADDING_BOTTOM_IOS: 16,
  /** Android: separación bajo iconos/texto (dentro del `minHeight`; no sumar otra vez en la reserva del viewport). */
  BOTTOM_BAR_ROW_PADDING_BOTTOM_ANDROID: 3,

  /**
   * Clearance below the bar when computing full-screen viewport height (feed item height, profile grids, etc.).
   * Reference: CommunityScreen (Para Ti).
   */
  BOTTOM_BAR_VIEWPORT_CLEARANCE_BELOW: 20,
  /**
   * Android: mismo rol que en iOS (franja entre el borde inferior del viewport y la barra flotante).
   * La fila de tabs en Android es ~6px más baja que en iOS (46 vs 52); +6px aquí iguala la sensación
   * de margen que en iOS (referencia). Teléfono y tablet comparten esta constante.
   */
  BOTTOM_BAR_VIEWPORT_CLEARANCE_BELOW_ANDROID: 26,

  /** Bottom inset for left-edge drawer gesture strips (Community / detail feed). */
  BOTTOM_BAR_EDGE_GESTURE_CLEARANCE_BELOW: 8,

  /**
   * Altura fija del bloque “flecha atrás + título” bajo AppTopBar (notificaciones, seguidos, etc.).
   * Debe coincidir con `headerRow` (padding + una línea de texto + borde).
   */
  FLOATING_BAR_STACK_SUBHEADER_HEIGHT: 48,

  /**
   * Franja oscura extra bajo el scroll en clan y frases (lápiz), alineada con la sensación del feed Para Ti.
   * Se resta de la altura del cuerpo y se suma al padding inferior del scroll.
   */
  BOTTOM_BAR_CLAN_PHRASES_STRIP_EXTRA: 18,

  BOTTOM_BAR_BORDER_RADIUS: 0,
  BOTTOM_BAR_ITEM_GAP: 0,

  /** Extra px on top of safe-area bottom inset. */
  BOTTOM_BAR_SAFE_AREA_COMPENSATION: 0,

  // ----- Texto: SIGUIENDO, PARA TI (+ icono perfil y búsqueda) -----
  /** Tamaño de fuente de las 3 pestañas de texto (activa e inactiva). */
  BOTTOM_BAR_TAB_TEXT_SIZE: 14,

  // ----- Línea bajo tab activa -----
  /** Grosor de la línea (px). */
  BOTTOM_BAR_UNDERLINE_THICKNESS: 2,
  /** Separación extra hacia abajo respecto al borde inferior del slot (px). */
  BOTTOM_BAR_UNDERLINE_TRANSLATE_Y: 5,
  /**
   * Largo de la línea (px). `null` = todo el ancho de la columna de esa tab (como hasta ahora).
   * Solo afecta a SIGUIENDO / MÁS VOTADAS / PARA TI.
   */
  BOTTOM_BAR_UNDERLINE_WIDTH_TEXT: 80,
  /**
   * Largo de la línea bajo la lupa (px). `null` = ancho completo de la columna.
   * Pon un valor cercano al tamaño del icono (p. ej. 20–28) para que no sobresalga.
   */
  BOTTOM_BAR_UNDERLINE_WIDTH_SEARCH: 64,

  // ----- Icono búsqueda (lupa, SVG por clan) -----
  /** Tamaño base (px) del marco de la lupa; se multiplica por SEARCH_ICON_FRAME_SCALE y por `BOTTOM_BAR_LUPITA_EDITOR.scale`. */
  BOTTOM_BAR_SEARCH_ICON_SIZE: 26,

  /** Escala base del asset (padding transparente del SVG). */
  SEARCH_ICON_FRAME_SCALE: 1.0,

  /**
   * Editor independiente: solo la lupa (no afecta a SIGUIENDO / MÁS VOTADAS / PARA TI).
   * Valores iniciales = offsets que antes eran SEARCH_ICON_OFFSET_*.
   */
  BOTTOM_BAR_LUPITA_EDITOR: {
    offsetX: -10,
    offsetY: 0,
    scale: 1,
  },

  /**
   * Solo la línea bajo la lupa: posición horizontal relativa (px).
   * Positivo = derecha, negativo = izquierda. No afecta a SIGUIENDO / MÁS VOTADAS / PARA TI.
   */
  BOTTOM_BAR_LUPITA_UNDERLINE_EDITOR: {
    offsetX: -10,
  },

  /** Botón + crear (entre MÁS VOTADAS y PARA TI). */
  BOTTOM_BAR_CREATE_BUTTON_SIZE: 34,
  BOTTOM_BAR_CREATE_BUTTON_BORDER_RADIUS: 10,
  BOTTOM_BAR_CREATE_BUTTON_BORDER_WIDTH: 1.5,

  // ----- Desplegable orden Siguiendo (fila SVG + texto) -----
  /**
   * Altura mínima de cada fila; si el texto pide más, la fila crece y el SVG se estira.
   * El texto se centra en ese rectángulo (misma idea que las tabs: ranura estirada + centro en Y).
   */
  FOLLOWING_SORT_DROPDOWN_ROW_MIN_HEIGHT: 52,
  /**
   * Desplazamiento en Y del bloque de texto en **todas** las filas (positivo = abajo).
   * Un solo valor para mantener la misma posición relativa al asset en todos los dispositivos.
   */
  FOLLOWING_SORT_DROPDOWN_TEXT_UNIVERSAL_OFFSET_Y: 0,
} as const;

function viewportClearanceBelowPx(): number {
  return Platform.OS === 'android'
    ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_VIEWPORT_CLEARANCE_BELOW_ANDROID
    : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_VIEWPORT_CLEARANCE_BELOW;
}

/** Altura exterior mínima de la fila de tabs (coincide con `styles.bar` `minHeight`; incluye su `paddingBottom`). */
export function bottomBarTabRowOuterHeightPx(): number {
  return Platform.OS === 'android'
    ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT_ANDROID
    : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT;
}

function bottomInsetForViewportReserve(insetBottom: number): number {
  // Siempre igual que `AppShellBottomTabsWrap` (`paddingBottom: insets.bottom`). Omitir el inset aquí
  // cuando window ≈ safeFrame dejaba el viewport demasiado alto y un hueco negro ~insetBottom sobre la barra.
  return insetBottom;
}

/**
 * Offset desde el borde inferior de la pantalla hasta el límite superior de la franja de gesto.
 * Usa **siempre** el inset real del sistema para alinearse con la barra flotante (nav 3 botones, etc.).
 */
export function getBottomBarEdgeGestureBottomOffset(insetBottom: number): number {
  return (
    bottomBarTabRowOuterHeightPx() +
    insetBottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_EDGE_GESTURE_CLEARANCE_BELOW
  );
}

export function shellBottomOffsetPx(): number {
  return Platform.OS === 'android'
    ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET_ANDROID
    : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET;
}

/** Height to subtract from screen when the main content area must clear the floating bottom bar (Para Ti). */
export function getBottomBarViewportReserveBottom(
  insetBottom: number,
  _windowHeight?: number,
  _safeFrameHeight?: number,
): number {
  const navInset = bottomInsetForViewportReserve(insetBottom);
  return (
    bottomBarTabRowOuterHeightPx() +
    navInset +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    viewportClearanceBelowPx()
  );
}

/**
 * Misma reserva que `getBottomBarViewportReserveBottom`: un solo valor para viewport y padding de scroll.
 */
export function getBottomBarScrollContentPaddingBottom(
  insetBottom: number,
  windowHeight?: number,
  safeFrameHeight?: number,
): number {
  return getBottomBarViewportReserveBottom(insetBottom, windowHeight, safeFrameHeight);
}
