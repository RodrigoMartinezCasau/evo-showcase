/**
 * PreviewModeContext
 * ==================
 * Modo de previsualización de diseño completamente aislado del flujo real.
 *
 * - `previewClanId`   → clan visual activo en preview (null = sin clan)
 * - `isPreviewActive` → true si el modo preview está encendido
 * - `setPreviewClan`  → activa el modo y fija el clan visual
 * - `exitPreview`     → apaga el modo y vuelve al estado real
 *
 * REGLA: previewClanId NUNCA toca ClassificationContext ni ningún estado real.
 * Solo lo consumen componentes visuales (colores, iconos, fondos).
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import type { ClanId } from '@evoconn/constants/clanColors';

type PreviewModeState = {
  isPreviewActive: boolean;
  previewClanId: ClanId | null;
  setPreviewClan: (id: ClanId | null) => void;
  exitPreview: () => void;
};

const PreviewModeContext = createContext<PreviewModeState>({
  isPreviewActive: false,
  previewClanId: null,
  setPreviewClan: () => {},
  exitPreview: () => {},
});

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  const [previewClanId, setPreviewClanId] = useState<ClanId | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const setPreviewClan = useCallback((id: ClanId | null) => {
    setPreviewClanId(id);
    setIsPreviewActive(true);
  }, []);

  const exitPreview = useCallback(() => {
    setIsPreviewActive(false);
    setPreviewClanId(null);
  }, []);

  return (
    <PreviewModeContext.Provider
      value={{ isPreviewActive, previewClanId, setPreviewClan, exitPreview }}
    >
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}
