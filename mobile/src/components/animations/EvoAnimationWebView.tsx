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
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import StarFieldBackground from './StarFieldBackground';
import { setEntryAnimPlaying } from '../../../mobile/lib/animationState';

// ─── Asset map ─────────────────────────────────────────────────────────────────
// HTML files are bundled as raw assets (assetExts includes 'html').
// SVG files cannot be bundled as binary assets because react-native-svg-transformer
// converts them to React components. Instead, all SVG content is pre-compiled into
// svg-data.json and written to documentDirectory at runtime.
// PNG animal files are bundled normally (binary assets).

export type EvoAnimationName = 'streak' | 'clanEntry' | 'clanReveal' | 'rankUp';

const HTML_MODULES: Record<EvoAnimationName, () => number> = {
  streak:     () => require('../../../mobile/assets/animations/streak.html'),
  clanEntry:  () => require('../../../mobile/assets/animations/clan-entry.html'),
  clanReveal: () => require('../../../mobile/assets/animations/clan-reveal.html'),
  rankUp:     () => require('../../../mobile/assets/animations/rank-up.html'),
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
};

// ─── File system setup ────────────────────────────────────────────────────────
const ANIM_DIR = (FileSystem.documentDirectory ?? '') + 'evo-animations/';
const ASSETS_DIR = ANIM_DIR + 'assets/';

let _copyPromise: Promise<void> | null = null;

export async function ensureAnimationAssets(): Promise<void> {
  if (_copyPromise) return _copyPromise;

  _copyPromise = (async () => {
    const STAMP_FILE = ANIM_DIR + '.stamp';
    const APP_VERSION = '35';

    try {
      const stampInfo = await FileSystem.getInfoAsync(STAMP_FILE);
      if (stampInfo.exists) {
        const stamp = await FileSystem.readAsStringAsync(STAMP_FILE);
        if (stamp === APP_VERSION) return; // already up to date
      }
    } catch {}

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

async function buildInlinedHtml(name: EvoAnimationName): Promise<string> {
  let html = await FileSystem.readAsStringAsync(ANIM_DIR + HTML_FILENAMES[name]);

  // 1. Replace SVG references using the in-memory SVG_DATA map.
  html = html.replace(/(['"`])assets\/([\w.\-]+\.svg)\1/g, (match, q, filename) => {
    const svg = SVG_DATA[filename];
    if (!svg) return match;
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
  html = html.replace(/(['"`])assets\/([\w.\-]+\.png)\1/g, (match, q, filename) => {
    const uri = pngData[filename];
    return uri ? `${q}${uri}${q}` : match;
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

  // Opacity of the WebView layer. Starts at 0 so the static starfield shows
  // through, then fades to 1 once the WebView has finished painting — making
  // the transition from static → animated stars invisible.
  const webOpacity = useRef(new Animated.Value(0)).current;

  // Reset webOpacity every time the animation is shown.
  useEffect(() => {
    if (visible) {
      webOpacity.setValue(0);
      setHtmlContent(null);
    }
  }, [visible, webOpacity]);

  // Called when the animation signals completion (or is closed).
  // Releases the entry guard immediately (so the community screen renders
  // behind the now-transparent modal), then calls the callback so the modal
  // unmounts. The HTML flash (opacity 1 white) is still covering everything
  // at this moment — it acts as the visual wipe so the switch to community
  // is imperceptible.
  const closeAndCall = useCallback(
    (callback?: (extra?: unknown) => void, extra?: unknown) => {
      setEntryAnimPlaying(false);
      callback?.(extra);
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    ensureAnimationAssets()
      .then(() => buildInlinedHtml(name))
      .then((content) => {
        if (!cancelled) setHtmlContent(content);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[EvoAnim] failed to build HTML:', e);
        if (!cancelled) onClose?.();
      });
    return () => { cancelled = true; };
  }, [visible, name, onClose]);

  const handleWebLoadEnd = useCallback(() => {
    // Once the WebView has painted its first frame, fade it in so the user
    // never sees a white flash or hard swap from the starfield.
    Animated.timing(webOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [webOpacity]);

  // Inject props as window.EVO_PROPS before the page loads — most reliable method.
  const injectedBeforeLoad = useMemo(
    () => `window.EVO_PROPS = ${JSON.stringify(params)}; true;`,
    [params],
  );

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
          break;
        case 'phase':
          onPhase?.(msg.phase ?? '');
          break;
        case 'tap':
          if (enableHaptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'milestone':
          if (enableHaptics) {
            if (msg.kind === 'year' || msg.kind === 'month')
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            else
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          break;
        case 'complete':
          // The HTML flash is still at opacity 1 when this fires — it acts as
          // the visual wipe. Close immediately so the community appears as the
          // flash covers the transition.
          closeAndCall(onComplete, msg);
          break;
        case 'close':
          closeAndCall(onClose);
          break;
        case 'error':
          if (__DEV__) console.warn('[EvoAnimation:' + name + ']', msg.message);
          break;
      }
    },
    [enableHaptics, closeAndCall, name, onComplete, onClose, onPhase],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeAndCall(onClose)}
    >
      <Animated.View style={styles.root}>
        {/*
          Layer 1 — Static starfield. Always visible while the modal is open.
          Serves as both the loading state and the seamless base for the animation
          (same dark background color + star style).
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
              source={{ html: htmlContent }}
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
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
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
