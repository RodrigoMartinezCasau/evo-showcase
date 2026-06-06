/**
 * EvoAnimationWebView
 *
 * Generic wrapper that loads an HTML animation file from the local filesystem
 * into a full-screen Modal WebView. HTML files live in assets/animations/ and
 * are copied to FileSystem.documentDirectory on first launch (via
 * ensureAnimationAssets). Both HTML and their relative asset/ folder are
 * served from the same directory, so relative paths work on both platforms.
 *
 * Props flow:  RN → HTML  via window.EVO_PROPS (injectedJavaScriptBeforeContentLoaded)
 *               + URL query string fallback for old Android WebViews.
 * Events flow: HTML → RN  via postMessage JSON: { type, ...extras }
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import StarFieldBackground from './StarFieldBackground';
import { setEntryAnimPlaying } from '../../../mobile/lib/animationState';
import { useEvoPreferences } from '@evoconn/hooks/EvoPreferencesContext';

// ─── Asset map ─────────────────────────────────────────────────────────────────
// HTML files are bundled as raw assets (assetExts includes 'html').
// SVG files cannot be bundled as binary assets because react-native-svg-transformer
// converts them to React components. Instead, all SVG content is pre-compiled into
// svg-data.json and written to documentDirectory at runtime.
// PNG animal files are bundled normally (binary assets).

export type EvoAnimationName = 'streak' | 'clanEntry' | 'clanReveal' | 'rankUp' | 'noUses' | 'lostStreak';

const HTML_MODULES: Record<EvoAnimationName, () => number> = {
  streak:     () => require('../../../mobile/assets/animations/streak.html'),
  clanEntry:  () => require('../../../mobile/assets/animations/clan-entry.html'),
  clanReveal: () => require('../../../mobile/assets/animations/clan-reveal.html'),
  rankUp:     () => require('../../../mobile/assets/animations/rank-up.html'),
  noUses:    () => require('../../../mobile/assets/animations/no-uses.html'),
  lostStreak: () => require('../../../mobile/assets/animations/lost-streak.html'),
};

// SVG data as pre-compiled JSON (avoids the react-native-svg-transformer conflict)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SVG_DATA: Record<string, string> = require('../../../mobile/assets/animations/svg-data.json');

// PNG animal files (bundled as binary assets — no SVG transformer conflict)
const ANIMAL_PNG_MODULES: Array<{ filename: string; module: () => number }> = [
  { filename: 'animal-stoic.png',              module: () => require('../../../mobile/assets/animations/assets/animal-stoic.png') },
  { filename: 'animal-nihilist.png',           module: () => require('../../../mobile/assets/animations/assets/animal-nihilist.png') },
  { filename: 'animal-scientist.png',          module: () => require('../../../mobile/assets/animations/assets/animal-scientist.png') },
  { filename: 'animal-transcendentalist.png',  module: () => require('../../../mobile/assets/animations/assets/animal-transcendentalist.png') },
  { filename: 'animal-existentialist.png',     module: () => require('../../../mobile/assets/animations/assets/animal-existentialist.png') },
  { filename: 'animal-humanist.png',           module: () => require('../../../mobile/assets/animations/assets/animal-humanist.png') },
  { filename: 'animal-realist.png',            module: () => require('../../../mobile/assets/animations/assets/animal-realist.png') },
  { filename: 'animal-rationalist.png',        module: () => require('../../../mobile/assets/animations/assets/animal-rationalist.png') },
];

const HTML_FILENAMES: Record<EvoAnimationName, string> = {
  streak:     'streak.html',
  clanEntry:  'clan-entry.html',
  clanReveal: 'clan-reveal.html',
  rankUp:     'rank-up.html',
  noUses:    'no-uses.html',
  lostStreak: 'lost-streak.html',
};

// ─── File system setup ────────────────────────────────────────────────────────
const ANIM_DIR = (FileSystem.documentDirectory ?? '') + 'evo-animations/';
const ASSETS_DIR = ANIM_DIR + 'assets/';

let _copyPromise: Promise<void> | null = null;

export async function ensureAnimationAssets(): Promise<void> {
  if (_copyPromise) return _copyPromise;

  _copyPromise = (async () => {
    const STAMP_FILE = ANIM_DIR + '.stamp';
    const APP_VERSION = '78';

    try {
      const stampInfo = await FileSystem.getInfoAsync(STAMP_FILE);
      if (stampInfo.exists) {
        const stamp = await FileSystem.readAsStringAsync(STAMP_FILE);
        if (stamp === APP_VERSION) return; // already up to date
      }
    } catch {}

    // Version changed: remove stale copied HTML/assets first. Some platforms do
    // not reliably overwrite copied bundle assets in-place, which left older
    // clan-entry.html versions (with the glow) running even after source edits.
    try {
      await FileSystem.deleteAsync(ANIM_DIR, { idempotent: true });
    } catch {}
    _inlinedHtmlCache.clear();

    // Create directories
    await FileSystem.makeDirectoryAsync(ANIM_DIR,   { intermediates: true });
    await FileSystem.makeDirectoryAsync(ASSETS_DIR, { intermediates: true });

    // Copy HTML files (bundled as binary assets)
    for (const [name, getModule] of Object.entries(HTML_MODULES) as [EvoAnimationName, () => number][]) {
      const filename = HTML_FILENAMES[name];
      try {
        const asset = Asset.fromModule(getModule());
        await asset.downloadAsync();
        const src = asset.localUri ?? asset.uri;
        await FileSystem.copyAsync({ from: src, to: ANIM_DIR + filename });
      } catch (e) {
        if (__DEV__) console.warn(`[EvoAnim] Failed to copy ${filename}:`, e);
      }
    }

    // Write SVG files from pre-compiled JSON (avoids SVG transformer conflict)
    for (const [filename, svgContent] of Object.entries(SVG_DATA)) {
      try {
        await FileSystem.writeAsStringAsync(ASSETS_DIR + filename, svgContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch (e) {
        if (__DEV__) console.warn(`[EvoAnim] Failed to write SVG ${filename}:`, e);
      }
    }

    // Copy PNG animal files (bundled as binary assets)
    for (const { filename, module: getModule } of ANIMAL_PNG_MODULES) {
      try {
        const asset = Asset.fromModule(getModule());
        await asset.downloadAsync();
        const src = asset.localUri ?? asset.uri;
        await FileSystem.copyAsync({ from: src, to: ASSETS_DIR + filename });
      } catch (e) {
        if (__DEV__) console.warn(`[EvoAnim] Failed to copy PNG ${filename}:`, e);
      }
    }

    // Write stamp
    try {
      await FileSystem.writeAsStringAsync(STAMP_FILE, APP_VERSION);
    } catch {}
  })();

  // Reset on rejection so the next call can retry instead of returning a stuck promise
  _copyPromise.catch(() => { _copyPromise = null; });

  return _copyPromise;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type EvoAnimationProps = {
  clanId?: string;
  previousClanId?: string | null;
  isChange?: boolean;
  streakCount?: number;
  previousStreakCount?: number;
  rank?: { previous: string; current: string; percentage: number };
  rankMessage?: string;
  locale?: 'es' | 'en';
  /** Inyectado en Android para `streak`: menos partículas / sin filtro costoso en la estrella. */
  animationLowGpu?: boolean;
};

type Props = {
  visible: boolean;
  name: EvoAnimationName;
  params?: EvoAnimationProps;
  onComplete?: (extra?: unknown) => void;
  onClose?: () => void;
  onPhase?: (phase: string) => void;
  enableHaptics?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Asset inlining ────────────────────────────────────────────────────────────
// iOS WKWebView loaded with loadHTMLString:baseURL: does NOT grant access to
// subdirectories (e.g. assets/). The only 100 % reliable cross-platform fix is
// to replace every  assets/foo.svg / assets/foo.png  reference inside the HTML
// string with an inline data URI before the WebView ever sees it.
//
// SVGs → already in SVG_DATA (bundled JS module, zero filesystem access needed).
// PNGs → read from ASSETS_DIR as base64 (copied there by ensureAnimationAssets).

// Cache del HTML inlined por animación (depende solo de `name`; los params van
// aparte vía EVO_PROPS). Precalentar clanEntry evita reconstruirlo cuando el
// hilo JS ya está saturado al arranque en Android gama baja.
const _inlinedHtmlCache = new Map<EvoAnimationName, string>();
const _inlinedHtmlInflight = new Map<EvoAnimationName, Promise<string>>();

function getInlinedHtml(name: EvoAnimationName): Promise<string> {
  const cached = _inlinedHtmlCache.get(name);
  if (cached) return Promise.resolve(cached);
  const inflight = _inlinedHtmlInflight.get(name);
  if (inflight) return inflight;
  const p = buildInlinedHtml(name)
    .then((html) => {
      _inlinedHtmlCache.set(name, html);
      _inlinedHtmlInflight.delete(name);
      return html;
    })
    .catch((e) => {
      _inlinedHtmlInflight.delete(name);
      throw e;
    });
  _inlinedHtmlInflight.set(name, p);
  return p;
}

/** Precalienta el HTML de entrada en cuanto los assets estén copiados. */
export function prewarmClanEntryHtml(): Promise<string> {
  return ensureAnimationAssets().then(() => getInlinedHtml('clanEntry'));
}

async function buildInlinedHtml(name: EvoAnimationName): Promise<string> {
  let html = await FileSystem.readAsStringAsync(ANIM_DIR + HTML_FILENAMES[name]);

  // 0a. Ensure correct mobile viewport so Android WebView doesn't default to
  //     the 980px desktop viewport.
  const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';
  if (!html.includes('name="viewport"') && !html.includes("name='viewport'")) {
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + VIEWPORT);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', '<HEAD>' + VIEWPORT);
    } else {
      html = VIEWPORT + html;
    }
  }

  // 0b. Android WebView loaded from a string (null origin) does not honour
  //     `position:fixed` — fixed elements collapse to 0×0 at (0,0), pushing
  //     all animation content to the top-left corner.
  //     Fix: override .stage and .flash to use position:absolute so they fill
  //     the body (which already has height:100% / width:100% in all HTML files).
  if (Platform.OS === 'android') {
    const ANDROID_POS_FIX =
      '<style id="evo-android-fix">' +
      'html,body{height:100%!important;width:100%!important;overflow:hidden!important}' +
      '.stage{position:absolute!important;top:0!important;left:0!important;right:0!important;bottom:0!important}' +
      '.flash{position:absolute!important;top:0!important;left:0!important;right:0!important;bottom:0!important;pointer-events:none!important}' +
      '</style>';
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + ANDROID_POS_FIX);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', '<HEAD>' + ANDROID_POS_FIX);
    } else {
      html = ANDROID_POS_FIX + html;
    }
  }

  // 1. Replace SVG references using the in-memory SVG_DATA map.
  html = html.replace(/(['"`])assets\/([\w.\-]+\.svg)\1/g, (_match: string, q: string, filename: string) => {
    const svg = SVG_DATA[filename];
    if (!svg) return _match;
    return `${q}data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}${q}`;
  });

  // 2. Collect unique PNG filenames referenced in this HTML.
  const pngNames = new Set<string>();
  const pngScan = /['"`]assets\/([\w.\-]+\.png)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = pngScan.exec(html)) !== null) pngNames.add(m[1]);

  // 3. Read each PNG as base64 and build a lookup map.
  const pngData: Record<string, string> = {};
  for (const filename of pngNames) {
    try {
      const b64 = await FileSystem.readAsStringAsync(ASSETS_DIR + filename, {
        encoding: FileSystem.EncodingType.Base64,
      });
      pngData[filename] = `data:image/png;base64,${b64}`;
    } catch (e) {
      if (__DEV__) console.warn(`[EvoAnim] PNG inline failed for ${filename}:`, e);
    }
  }

  // 4. Replace PNG references with data URIs.
  html = html.replace(/(['"`])assets\/([\w.\-]+\.png)\1/g, (_match: string, q: string, filename: string) => {
    const uri = pngData[filename];
    return uri ? `${q}${uri}${q}` : _match;
  });

  return html;
}

export function EvoAnimationWebView({
  visible,
  name,
  params = {},
  onComplete,
  onClose,
  onPhase,
  enableHaptics = true,
}: Props) {
  const webRef = useRef<WebView>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  // Desmontaje local inmediato al completar/cerrar: un Modal de RN sigue
  // capturando toques aunque esté a opacidad 0 si permanece montado. Si el padre
  // (cola de animaciones) tardara o fallara en poner `visible=false`, la pantalla
  // quedaría congelada (caso del "Continuar" del aumento de rango). Con esto el
  // Modal deja de existir en cuanto la animación termina, pase lo que pase fuera.
  const [dismissed, setDismissed] = useState(false);

  // Preferences: combine prop flag with user preference
  const { hapticsEnabled: prefHaptics } = useEvoPreferences();
  const effectiveHaptics = enableHaptics && prefHaptics;

  // ── Prolonged-haptic loop ─────────────────────────────────────────────────
  const hapticLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHapticLoop = useCallback(() => {
    if (hapticLoopRef.current !== null) {
      clearInterval(hapticLoopRef.current);
      hapticLoopRef.current = null;
    }
  }, []);

  /** Start a sustained haptic that fires every 55ms for `durationMs`.
   *  When `progressive` is true, intensity ramps Light→Medium→Heavy. */
  const startHapticLoop = useCallback((durationMs: number, progressive = false) => {
    stopHapticLoop();
    if (!effectiveHaptics) return;
    const INTERVAL = 55;
    let elapsed = 0;
    hapticLoopRef.current = setInterval(() => {
      elapsed += INTERVAL;
      if (elapsed >= durationMs) { stopHapticLoop(); return; }
      const progress = elapsed / durationMs;
      const style = progressive
        ? progress < 0.4  ? Haptics.ImpactFeedbackStyle.Light
        : progress < 0.75 ? Haptics.ImpactFeedbackStyle.Medium
        :                   Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(style).catch(() => {});
    }, INTERVAL);
  }, [effectiveHaptics, stopHapticLoop]);

  // Stop haptic loop when the animation is hidden / unmounted
  useEffect(() => {
    if (!visible) stopHapticLoop();
    return () => stopHapticLoop();
  }, [visible, stopHapticLoop]);

  // ── Tap / phase tracking for clan-reveal sound differentiation ────────────
  const tapCountRef    = useRef(0);
  const currentPhaseRef = useRef('');

  // Reset tap counter when a new animation becomes visible
  useEffect(() => {
    if (visible) {
      tapCountRef.current = 0;
      currentPhaseRef.current = '';
    }
  }, [visible]);

  // Opacity of the WebView layer: 0 on mount, fades to 1 on first paint.
  const webOpacity = useRef(new Animated.Value(0)).current;

  // Opacity of the entire modal root: stays at 1 during the animation,
  // then fades to 0 when complete fires — revealing the community screen
  // (already rendered behind the modal) as the white flash dissolves.
  const rootOpacity = useRef(new Animated.Value(1)).current;

  // Reset both opacities every time the animation becomes visible.
  useEffect(() => {
    if (visible) {
      setDismissed(false);
      rootOpacity.setValue(1);
      webOpacity.setValue(0);
      const cached = _inlinedHtmlCache.get(name);
      setHtmlContent(cached ?? null);
    }
  }, [visible, name, rootOpacity, webOpacity]);

  // Called when the animation signals completion (or is closed).
  //
  // Important: do not keep a transparent Modal mounted after complete. RN
  // Modals keep intercepting touches even at opacity: 0; on clan entry this
  // could leave the feed visible but untouchable until a later safety timeout.
  // The app screen is already rendered behind the animation by the time
  // "complete" fires, so unmount immediately.
  const closeAndCall = useCallback(
    (callback?: (extra?: unknown) => void, extra?: unknown) => {
      setEntryAnimPlaying(false); // safety net if phase handler didn't fire
      rootOpacity.setValue(0);
      // Desmonta el Modal aquí mismo (no esperamos al padre): evita que un Modal
      // invisible siga interceptando toques y congele la pantalla.
      setDismissed(true);
      callback?.(extra);
    },
    [rootOpacity],
  );

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    ensureAnimationAssets()
      .then(() => getInlinedHtml(name))
      .then((content) => {
        if (!cancelled) setHtmlContent(content);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[EvoAnim] failed to build HTML:', e);
        if (!cancelled) onClose?.();
      });
    return () => { cancelled = true; };
  }, [visible, name, onClose]);

  const fadeInWebView = useCallback(
    (durationMs: number, onVisible?: () => void) => {
      Animated.timing(webOpacity, {
        toValue: 1,
        duration: durationMs,
        useNativeDriver: true,
      }).start(() => onVisible?.());
    },
    [webOpacity],
  );

  const startClanEntrySequence = useCallback(() => {
    webRef.current?.injectJavaScript(
      'window.EVO_BRIDGE && window.EVO_BRIDGE.beginEntry && window.EVO_BRIDGE.beginEntry(); true;',
    );
  }, []);

  const handleWebLoadEnd = useCallback(() => {
    // clan-entry: fade + start are driven by the HTML `ready` message (synced start).
    if (name === 'clanEntry') return;
    fadeInWebView(350);
  }, [name, fadeInWebView]);

  const { width: winW, height: winH } = useWindowDimensions();

  // Inject props + real screen dimensions before the page loads.
  const injectedBeforeLoad = useMemo(() => {
    const base: Record<string, unknown> = { ...params, soundsEnabled: false };
    if (Platform.OS === 'android' && (name === 'streak' || name === 'clanEntry')) {
      base.animationLowGpu = true;
    }
    return `window.EVO_PROPS = ${JSON.stringify(base)}; window.EVO_SCREEN_WIDTH = ${winW}; window.EVO_SCREEN_HEIGHT = ${winH}; true;`;
  }, [params, winW, winH, name]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: { type: string; phase?: string; kind?: string } & Record<string, unknown>;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'ready':
          if (name === 'clanEntry') {
            // Con StarFieldBackground siempre detrás, el fade puede ser muy corto:
            // las estrellas RN y las del HTML son idénticas (seed=42), así que un
            // cross-fade rápido es imperceptible y elimina el "salto" visual.
            const fadeMs = Platform.OS === 'android' ? 80 : 120;
            fadeInWebView(fadeMs, startClanEntrySequence);
          }
          break;

        case 'phase': {
          const phase = msg.phase ?? '';
          onPhase?.(phase);
          currentPhaseRef.current = phase;

          // Reset tap counter when entering the tapping phase (clan-reveal)
          if (phase === 'fadein' || phase === 'tapping') {
            tapCountRef.current = 0;
          }

          // Pre-render community screen on flash start (existing logic)
          if (phase === 'exit' || phase === 'zoom_fill') {
            setEntryAnimPlaying(false);
          }

          // Stop any ongoing haptic loop on transition phases
          if (['flash', 'fire', 'reveal', 'exit', 'final', 'zoom_fill'].includes(phase)) {
            stopHapticLoop();
          }

          // ── Prolonged haptic: streak star spin (2 000ms) ─────────────────
          // Fires on `phase('star')`, the same moment the spin begins.
          if (phase === 'star' && name === 'streak') {
            startHapticLoop(2000, false);
          }

          // ── Prolonged progressive haptic: clan spinning ring (3 000ms) ───
          // Only fires on clanReveal (3-tap reveal). clanEntry (app intro) is excluded.
          if (phase === 'spinning' && name === 'clanReveal') {
            startHapticLoop(3000, true);
          }
          break;
        }

        case 'tap':
          // Always fire the Light tap haptic
          if (effectiveHaptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Track tap count for clan-reveal (sounds handled in HTML via Web Audio)
          if (name === 'clanReveal' && currentPhaseRef.current === 'tapping') {
            tapCountRef.current = Math.min(tapCountRef.current + 1, 3);
          }
          break;

        case 'milestone':
          if (effectiveHaptics) {
            if (msg.kind === 'depleted')
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            else if (msg.kind === 'year' || msg.kind === 'month')
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          break;

        case 'complete':
          stopHapticLoop();
          closeAndCall(onComplete, msg);
          break;

        case 'close':
          stopHapticLoop();
          closeAndCall(onClose);
          break;

        case 'error':
          if (__DEV__) console.warn('[EvoAnimation:' + name + ']', msg.message);
          break;
      }
    },
    [effectiveHaptics, closeAndCall, name, onComplete, onClose, onPhase,
     fadeInWebView, startClanEntrySequence, startHapticLoop, stopHapticLoop],
  );

  if (!visible || dismissed) return null;

  return (
    <Modal
      visible={visible && !dismissed}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeAndCall(onClose)}
    >
      {/*
        On Android with edgeToEdgeEnabled the Modal may not correctly fill the full
        screen with flex:1 alone. Using absoluteFill + explicit dimensions ensures the
        animation covers every pixel including behind the status bar and navigation bar.
      */}
      <Animated.View
        style={[
          Platform.OS === 'android' ? StyleSheet.absoluteFill : styles.root,
          { opacity: rootOpacity, backgroundColor: '#0f0f12' },
        ]}
      >
        {/*
          StarFieldBackground siempre visible detrás del WebView.
          Antes se omitía para clanEntry porque causaba un jump en Android con la
          implementación antigua (estrella spin). Ahora que clanEntry usa el mismo
          pipeline de ring/rotor que el sin-clan, el jump ya no ocurre.
          Tenerlo siempre presente elimina el flash negro que aparecía entre el
          overlay estático de (tabs)/_layout y el momento en que el HTML cargaba:
            estrellas RN (overlay) → estrellas RN (Modal) → estrellas HTML (fade-in)
          Todos usan el mismo seed=42 → mismas posiciones → transición imperceptible.
        */}
        <StarFieldBackground />

        {/*
          Layer 2 — WebView animation. Rendered on top once htmlContent is ready,
          but starts fully transparent. Fades to opacity 1 on onLoadEnd, so the
          transition from static stars → animated stars is imperceptible.
        */}
        {htmlContent && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: webOpacity }]}>
            <WebView
              ref={webRef}
              source={{ html: htmlContent, baseUrl: 'https://localhost/' }}
              originWhitelist={['*']}
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              // Android: "software" suavizaba toques pero laggeaba canvas/CSS; toques de racha van en HTML.
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
              scalesPageToFit={false}
              injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
              onMessage={onMessage}
              onLoadEnd={handleWebLoadEnd}
              style={styles.web}
            />
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f12' },
  web:  { flex: 1, backgroundColor: '#0f0f12' },
});
