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
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';

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
    const APP_VERSION = '12';

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
  const [htmlUri, setHtmlUri] = useState<string | null>(null);

  // Resolve local URI when visible
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    ensureAnimationAssets()
      .then(() => {
        if (!cancelled) setHtmlUri(ANIM_DIR + HTML_FILENAMES[name]);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[EvoAnim] ensureAnimationAssets failed:', e);
        // Close the modal instead of staying stuck on the loading spinner
        if (!cancelled) onClose?.();
      });
    return () => { cancelled = true; };
  }, [visible, name, onClose]);

  // Build query string (fallback for Android webviews that strip query on file:// URIs)
  const queryString = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v == null) return;
      if (typeof v === 'object') usp.set(k, JSON.stringify(v));
      else usp.set(k, String(v));
    });
    return usp.toString();
  }, [params]);

  // Inject props as window.EVO_PROPS before the page loads — most reliable method
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
          onComplete?.(msg);
          break;
        case 'close':
          onClose?.();
          break;
        case 'error':
          if (__DEV__) console.warn('[EvoAnimation:' + name + ']', msg.message);
          break;
      }
    },
    [enableHaptics, name, onComplete, onClose, onPhase],
  );

  if (!visible) return null;

  const uriWithQuery = htmlUri
    ? `${htmlUri}${queryString ? '?' + queryString : ''}`
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {uriWithQuery ? (
          <WebView
            ref={webRef}
            source={{ uri: uriWithQuery }}
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
            style={styles.web}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color="#c7ff02" size="large" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0f0f12' },
  web:     { flex: 1, backgroundColor: '#0f0f12' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f12' },
});
