import React, { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { resolveTopPhraseWidgetPayload } from './widgetPhraseLock';
import { pushTopPhraseWidgetSnapshot } from './iosWidgetBridge';

const DEBOUNCE_MS = 400;

/**
 * Sincroniza el widget con la frase más votada de **ayer**, fijada todo el día local.
 * Android: no empuja `{ kind: "empty" }` hasta tener candidato o feed con frases pasadas.
 */
export function WidgetSnapshotSync() {
  const { posts } = useFeedStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSnapshot = useCallback(() => {
    void (async () => {
      const payload = await resolveTopPhraseWidgetPayload(posts);
      if (Platform.OS === 'android' && payload == null) {
        return;
      }
      void pushTopPhraseWidgetSnapshot(payload);
    })();
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
