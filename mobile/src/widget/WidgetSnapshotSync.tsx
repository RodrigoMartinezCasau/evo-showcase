import React, { useEffect, useRef } from 'react';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { computeTopPhraseWidgetPayload } from './topPhraseWidgetPayload';
import { pushTopPhraseWidgetSnapshot } from './iosWidgetBridge';

const DEBOUNCE_MS = 400;

/**
 * Keeps the iOS home-screen widget snapshot in sync with the in-app feed (simulation / future API).
 * Requires a native `EvoWidgetBridge` + WidgetKit target — see `iosWidgetBridge.ts`.
 */
export function WidgetSnapshotSync() {
  const { posts } = useFeedStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload = computeTopPhraseWidgetPayload(posts);
      void pushTopPhraseWidgetSnapshot(payload);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [posts]);

  return null;
}
