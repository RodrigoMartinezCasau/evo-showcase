/**
 * NavLoadingContext — overlay de carga GLOBAL e instantáneo para la navegación.
 *
 * Problema: al pulsar un icono que lleva a una pantalla principal pesada
 * (perfil, clan, etc.), el hilo JS se bloquea montando el destino y NO se pinta
 * nada durante 3-7 s → el usuario siente que la app se ha colgado.
 *
 * Solución: `navigateUnlessCurrent` (ver navigationDuplicateGuard) dispara este
 * overlay ANTES de navegar, sobre la pantalla actual (que ya está pintada), y
 * difiere el `router.push` un par de frames para que el spinner se pinte
 * primero. Así el usuario ve "cargando" al instante en CUALQUIER navegación a
 * pantalla principal, sin tocar cada call site.
 *
 * El overlay se auto-oculta cuando cambia la ruta (el destino ya montó su
 * primer frame y muestra su propio `ClanLoadingDot`), con un timeout de
 * seguridad para no quedarse colgado nunca.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { evoconnColors } from '@evoconn/theme/colors';
import { getAppTopBarLayoutHeight } from '@evoconn/constants/topBarLayout';
import { getBottomBarViewportReserveBottom } from '@evoconn/constants/bottomBarLayout';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { registerNavLoadingShow } from '@evoconn/utils/navigationDuplicateGuard';

type NavLoadingShowOpts = {
  clanId?: string | null;
  /**
   * `true` = el overlay NO se oculta al cambiar la ruta; permanece hasta que la
   * pantalla destino llame a `hide()` (o salte el timeout de seguridad). Se usa
   * para Comunidad, donde lo lento es la hidratación del feed que ocurre DESPUÉS
   * del cambio de ruta.
   */
  hold?: boolean;
};

type NavLoadingState = { visible: boolean; clanId: string | null; hold: boolean };

type NavLoadingApi = NavLoadingState & {
  show: (opts?: NavLoadingShowOpts) => void;
  hide: () => void;
};

const NavLoadingContext = createContext<NavLoadingApi | null>(null);

/** Tope de seguridad: el overlay nunca permanece más de esto en pantalla. */
const MAX_OVERLAY_MS = 6000;

export function NavLoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NavLoadingState>({
    visible: false,
    clanId: null,
    hold: false,
  });
  const pathname = usePathname();

  const show = useCallback((opts?: NavLoadingShowOpts) => {
    setState({ visible: true, clanId: opts?.clanId ?? null, hold: opts?.hold ?? false });
  }, []);
  const hide = useCallback(() => {
    setState((s) => (s.visible ? { visible: false, clanId: null, hold: false } : s));
  }, []);

  // Registrar `show` a nivel de módulo para que navigateUnlessCurrent lo dispare
  // sin acoplar cada punto de navegación a este contexto.
  useEffect(() => {
    registerNavLoadingShow(show);
    return () => registerNavLoadingShow(null);
  }, [show]);

  // Auto-ocultar al cambiar la ruta: cuando `pathname` cambia, el destino ya ha
  // montado y pintado su primer frame (su propio spinner), así que tras un par
  // de frames retiramos el overlay global para un relevo sin parpadeos.
  //
  // EXCEPCIÓN: en modo `hold` (Comunidad: Para Ti / Siguiendo) NO ocultamos al
  // cambiar de ruta, porque lo lento es la hidratación del feed que sucede
  // DESPUÉS del cambio de ruta. En ese caso el overlay lo cierra la propia
  // CommunityScreen cuando ya está interactiva (o el timeout de seguridad).
  const visibleRef = useRef(state.visible);
  visibleRef.current = state.visible;
  const holdRef = useRef(state.hold);
  holdRef.current = state.hold;
  useEffect(() => {
    if (!visibleRef.current) return;
    if (holdRef.current) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => hide());
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [pathname, hide]);

  // Seguridad: si por lo que sea la ruta no cambia, no dejar el overlay colgado.
  useEffect(() => {
    if (!state.visible) return;
    const t = setTimeout(hide, MAX_OVERLAY_MS);
    return () => clearTimeout(t);
  }, [state.visible, hide]);

  const value = useMemo<NavLoadingApi>(
    () => ({ ...state, show, hide }),
    [state, show, hide],
  );

  return (
    <NavLoadingContext.Provider value={value}>{children}</NavLoadingContext.Provider>
  );
}

export function useNavLoading(): NavLoadingApi {
  const ctx = useContext(NavLoadingContext);
  if (!ctx) {
    throw new Error('useNavLoading must be used within NavLoadingProvider');
  }
  return ctx;
}

/**
 * Overlay de la franja CENTRAL; se monta una sola vez en el _layout. No cubre
 * la barra superior (`AppTopBar`) ni la inferior (barra flotante), que se
 * mantienen visibles de la pantalla actual → sensación de continuidad: solo
 * cambia el contenido del medio mientras se carga.
 */
export function NavLoadingOverlay() {
  const { visible, clanId: fallbackClanId } = useNavLoading();
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const { height: windowHeight } = useWindowDimensions();
  // El spinner usa SIEMPRE el clan del usuario (no el de la ruta destino), para
  // que el color sea consistente en toda la app.
  const userClanId = useEffectiveClanId();

  const top = getAppTopBarLayoutHeight(insets.top);
  const bottom = getBottomBarViewportReserveBottom(
    insets.bottom,
    windowHeight,
    frame.height,
  );

  if (!visible) return null;
  return (
    <View style={[styles.overlay, { top, bottom }]} pointerEvents="auto">
      <ClanLoadingDot clanId={userClanId ?? fallbackClanId} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: evoconnColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});
