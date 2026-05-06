import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SidebarFolder } from '@evoconn/types';
import { mockSidebarFolders } from '@evoconn/data/mockSidebarFolders';
import {
  loadSidebarFoldersFromStorage,
  saveSidebarFoldersToStorage,
} from '@evoconn/services/sidebarFoldersStorage';

/** Carpetas que antes venían por defecto (Filosofía / Política); se borran del almacén local. */
function isLegacyDefaultSidebarFolders(list: SidebarFolder[]): boolean {
  if (list.length !== 2) return false;
  const byId = Object.fromEntries(list.map((f) => [f.id, f.name]));
  return byId.f1 === 'Filosofía' && byId.f2 === 'Política';
}

type ConversationFoldersContextValue = {
  folders: SidebarFolder[];
  setFolders: React.Dispatch<React.SetStateAction<SidebarFolder[]>>;
  addFolder: (name: string) => void;
};

const ConversationFoldersContext = createContext<ConversationFoldersContextValue | null>(null);

export function ConversationFoldersProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<SidebarFolder[]>(() => mockSidebarFolders.map((f) => ({ ...f })));
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSidebarFoldersFromStorage();
      if (cancelled) return;
      if (isLegacyDefaultSidebarFolders(stored)) {
        setFolders([]);
        await saveSidebarFoldersToStorage([]);
      } else if (stored.length > 0) {
        setFolders(stored);
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveSidebarFoldersToStorage(folders);
  }, [folders]);

  const addFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setFolders((prev) => [...prev, { id, name: trimmed }]);
  }, []);

  const value = useMemo(
    () => ({ folders, setFolders, addFolder }),
    [folders, addFolder],
  );
  return (
    <ConversationFoldersContext.Provider value={value}>
      {children}
    </ConversationFoldersContext.Provider>
  );
}

export function useConversationFolders(): ConversationFoldersContextValue {
  const ctx = useContext(ConversationFoldersContext);
  if (!ctx) {
    throw new Error('useConversationFolders must be used within ConversationFoldersProvider');
  }
  return ctx;
}
