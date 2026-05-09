/**
 * Feed a pantalla completa (Para ti / Siguiendo): cuántas tarjetas mantener
 * montadas por delante/detrás para que el paging vertical no “pinte” bajo demanda.
 *
 * `windowSize` en FlatList es un múltiplo de la altura de viewport (~1 post).
 */
export const COMMUNITY_DETAIL_PREFETCH_POSTS = 7;

/** ~7 viewports arriba + abajo del buffer (default RN es 21). */
export const COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE = 15;

/**
 * iOS: deceleración del scroll con `pagingEnabled` (una publicación por viewport).
 * Más bajo = menos inercia entre páginas. Rango típico 0.98–0.999.
 */
export const COMMUNITY_DETAIL_DECELERATION_RATE_IOS = 0.988;
