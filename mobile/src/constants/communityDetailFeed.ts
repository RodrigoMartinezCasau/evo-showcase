/**
 * Feed a pantalla completa (Para ti / Siguiendo): cuántas tarjetas mantener
 * montadas por delante/detrás para que el paging vertical no "pinte" bajo demanda.
 *
 * `windowSize` en FlatList es un múltiplo de la altura de viewport (~1 post).
 *
 * Android usa valores más ajustados para reducir la presión de memoria y el lag
 * del JS thread que causa stutters al scrollear. El número de posts renderizados
 * en paralelo es mucho menor (3 vs 15 viewports), lo que mejora el rendimiento.
 */
/**
 * iOS: bajado de 5 → 2. Cada página del feed (Para ti / Siguiendo / detalle) es
 * un `ReflectionDetailItem` muy pesado (decenas de useState + 12 contextos +
 * sistema de comentarios). Montar 5 a la vez al abrir era el grueso del "tirón"
 * de entrada. Con paginación (1 post por viewport) basta montar el actual + 1.
 */
export const COMMUNITY_DETAIL_PREFETCH_POSTS = 2;
export const COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID = 2;

/** ~5 viewports arriba + abajo del buffer (default RN es 21). Bajado de 15→11
 * para montar menos posts a la vez y reducir el trabajo del JS thread. */
export const COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE = 11;
/** Android: ventana más pequeña = menos posts montados = menos lag en JS thread. */
export const COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID = 5;

/** Android: batch menor para distribuir el trabajo de render en más frames. */
export const COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID = 2;
/** Android: más tiempo entre batches para no bloquear el JS thread mientras se scrollea. */
export const COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID = 150;

/**
 * iOS: deceleración del scroll con `pagingEnabled` (una publicación por viewport).
 * Más bajo = menos inercia entre páginas. Rango típico 0.98–0.999.
 */
export const COMMUNITY_DETAIL_DECELERATION_RATE_IOS = 0.988;
