import React, { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { computeTopPhraseWidgetPayload } from './topPhraseWidgetPayload';
import { pushTopPhraseWidgetSnapshot } from './iosWidgetBridge';

const DEBOUNCE_MS = 400;

/**
 * Keeps the home-screen widget snapshot in sync with the in-app feed.
 * iOS: unchanged behaviour (WidgetKit).
 * Android: skips empty snapshots so a loaded phrase is not wiped before posts hydrate;
 * refreshes when the app returns to foreground.
 */
export function WidgetSnapshotSync() {
  const { posts } = useFeedStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSnapshot = useCallback(() => {
    const payload = computeTopPhraseWidgetPayload(posts);
    if (Platform.OS === 'android' && payload == null) {
      return;
    }
    void pushTopPhraseWidgetSnapshot(payload);
  }, [posts]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(pushSnapshot, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pushSnapshot]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pushSnapshot();
    });
    return () => sub.remove();
  }, [pushSnapshot]);

  return null;
}
