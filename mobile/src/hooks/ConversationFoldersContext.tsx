import React, { createContext, useContext, useMemo, useState } from 'react';
import type { SidebarFolder } from '@evoconn/types';
import { mockSidebarFolders } from '@evoconn/data/mockSidebarFolders';

type ConversationFoldersContextValue = {
  folders: SidebarFolder[];
  setFolders: React.Dispatch<React.SetStateAction<SidebarFolder[]>>;
};

const ConversationFoldersContext = createContext<ConversationFoldersContextValue | null>(null);

export function ConversationFoldersProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<SidebarFolder[]>(() =>
    mockSidebarFolders.map((f) => ({ ...f })),
  );
  const value = useMemo(
    () => ({ folders, setFolders }),
    [folders],
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
