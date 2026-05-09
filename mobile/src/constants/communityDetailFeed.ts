/**
 * Feed a pantalla completa (Para ti / Siguiendo): cuántas tarjetas mantener
 * montadas por delante/detrás para que el paging vertical no “pinte” bajo demanda.
 *
 * `windowSize` en FlatList es un múltiplo de la altura de viewport (~1 post).
 */
export const COMMUNITY_DETAIL_PREFETCH_POSTS = 7;

/** ~7 viewports arriba + abajo del buffer (default RN es 21). */
export const COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE = 15;
