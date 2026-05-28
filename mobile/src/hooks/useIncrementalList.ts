/**
 * useIncrementalList — paginación en cliente para listas largas ya cargadas en memoria.
 *
 * En vez de pasar el array completo a una FlatList/ScrollView (que obliga a
 * montar/medir todo de golpe en horas pico → lag y crashes en gama media),
 * revela los datos en bloques de `pageSize` y carga más al llegar al final.
 *
 * No re-pide nada a la red: solo controla CUÁNTOS items se muestran. Ideal para
 * seguidores/seguidos/amigos y comentarios, donde la fuente ya está hidratada.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export type IncrementalList<T> = {
  /** Slice visible actual (los primeros N items). */
  visibleData: T[];
  /** Quedan más items por revelar. */
  hasMore: boolean;
  /** Revela el siguiente bloque (usar en onEndReached). */
  loadMore: () => void;
  /** Vuelve al primer bloque (p. ej. al cambiar de usuario/post). */
  reset: () => void;
  /** Garantiza que al menos `n` items estén visibles (deep links, scroll a item). */
  ensureCount: (n: number) => void;
};

export function useIncrementalList<T>(
  data: T[],
  pageSize: number = 20,
): IncrementalList<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // Evita un re-render extra al cargar más sobre datos que aún no han crecido.
  const dataLenRef = useRef(data.length);
  dataLenRef.current = data.length;

  const visibleData = useMemo(
    () => data.slice(0, visibleCount),
    [data, visibleCount],
  );

  const hasMore = visibleCount < data.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) =>
      c >= dataLenRef.current ? c : Math.min(c + pageSize, dataLenRef.current),
    );
  }, [pageSize]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  const ensureCount = useCallback((n: number) => {
    setVisibleCount((c) => (c >= n ? c : Math.min(n, dataLenRef.current)));
  }, []);

  return { visibleData, hasMore, loadMore, reset, ensureCount };
}
