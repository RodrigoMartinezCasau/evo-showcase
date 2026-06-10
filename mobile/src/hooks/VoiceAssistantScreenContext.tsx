import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useFocusEffect, usePathname } from 'expo-router';

import {
  mergeScreenContextText,
  type VoiceAssistantScreenSnapshot,
} from '@evoconn/utils/voiceAssistantScreenContext';

type Entry = {
  ownerId: symbol;
  snapshot: VoiceAssistantScreenSnapshot;
};

type VoiceAssistantScreenContextValue = {
  setScreenContext: (ownerId: symbol, snapshot: VoiceAssistantScreenSnapshot) => void;
  clearScreenContext: (ownerId: symbol) => void;
  getScreenContextText: () => string | null;
  /** Snapshot estructurado registrado (o null) — para acciones del agente. */
  getScreenSnapshot: () => VoiceAssistantScreenSnapshot | null;
};

const VoiceAssistantScreenContext = createContext<VoiceAssistantScreenContextValue | null>(null);

export function VoiceAssistantScreenContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const entryRef = useRef<Entry | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const setScreenContext = useCallback((ownerId: symbol, snapshot: VoiceAssistantScreenSnapshot) => {
    entryRef.current = { ownerId, snapshot };
  }, []);

  const clearScreenContext = useCallback((ownerId: symbol) => {
    if (entryRef.current?.ownerId === ownerId) {
      entryRef.current = null;
    }
  }, []);

  const getScreenContextText = useCallback(() => {
    return mergeScreenContextText(entryRef.current?.snapshot.text, pathnameRef.current);
  }, []);

  const getScreenSnapshot = useCallback(() => entryRef.current?.snapshot ?? null, []);

  const value = useMemo(
    () => ({ setScreenContext, clearScreenContext, getScreenContextText, getScreenSnapshot }),
    [clearScreenContext, getScreenContextText, getScreenSnapshot, setScreenContext],
  );

  return (
    <VoiceAssistantScreenContext.Provider value={value}>
      {children}
    </VoiceAssistantScreenContext.Provider>
  );
}

function useVoiceAssistantScreenContextApi(): VoiceAssistantScreenContextValue {
  const ctx = useContext(VoiceAssistantScreenContext);
  if (!ctx) {
    throw new Error('VoiceAssistantScreenContextProvider is missing');
  }
  return ctx;
}

/** Registra el contenido visible mientras el componente está montado. */
export function useVoiceAssistantScreenContext(
  snapshot: VoiceAssistantScreenSnapshot | null | undefined,
): void {
  const ownerId = useRef(Symbol('voice-assistant-screen')).current;
  const { setScreenContext, clearScreenContext } = useVoiceAssistantScreenContextApi();

  useEffect(() => {
    if (snapshot?.text?.trim()) {
      setScreenContext(ownerId, snapshot);
    } else {
      clearScreenContext(ownerId);
    }
    return () => clearScreenContext(ownerId);
  }, [snapshot?.text, snapshot?.kind, ownerId, setScreenContext, clearScreenContext]);
}

/** Para callbacks (FlatList viewability) y pantallas con foco explícito. */
export function useVoiceAssistantScreenContextOwner() {
  const ownerId = useRef(Symbol('voice-assistant-screen-owner')).current;
  const { setScreenContext, clearScreenContext } = useVoiceAssistantScreenContextApi();
  return { ownerId, setScreenContext, clearScreenContext };
}

export function useVoiceAssistantScreenContextReader(): () => string | null {
  const { getScreenContextText } = useVoiceAssistantScreenContextApi();
  return getScreenContextText;
}

/** Lector del snapshot estructurado (acciones del agente sobre el post visible). */
export function useVoiceAssistantScreenSnapshotReader(): () => VoiceAssistantScreenSnapshot | null {
  const { getScreenSnapshot } = useVoiceAssistantScreenContextApi();
  return getScreenSnapshot;
}

/**
 * Registra contexto solo mientras la pantalla tiene foco (perfil, clan, etc.).
 * Actualiza si cambian los datos con la pantalla ya visible.
 */
export function useVoiceAssistantFocusedScreenContext(
  snapshot: VoiceAssistantScreenSnapshot | null | undefined,
): void {
  const ownerId = useRef(Symbol('voice-assistant-focused-screen')).current;
  const { setScreenContext, clearScreenContext } = useVoiceAssistantScreenContextApi();
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (snapshot?.text?.trim()) {
        setScreenContext(ownerId, snapshot);
      }
      return () => {
        focusedRef.current = false;
        clearScreenContext(ownerId);
      };
    }, [snapshot?.text, snapshot?.kind, ownerId, setScreenContext, clearScreenContext]),
  );

  useEffect(() => {
    if (!focusedRef.current || !snapshot?.text?.trim()) return;
    setScreenContext(ownerId, snapshot);
  }, [snapshot?.text, snapshot?.kind, ownerId, setScreenContext]);
}
