/**
 * AISettingsContext — shared source of truth for AI output flags.
 *
 * Consumed by:
 *   - SettingsScreen  (reads & writes via useAISettings)
 *   - ReflectionCreationScreen / PhraseCreationScreen (reads to pass flags to API)
 *
 * Flags:
 *   includeReflectiveQuestion        — whether to append a Socratic question
 *   includePhilosophicalReferences   — whether to cite philosopher references
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

interface AISettings {
  includeReflectiveQuestion:      boolean;
  includePhilosophicalReferences: boolean;
  setIncludeReflectiveQuestion:      (v: boolean) => void;
  setIncludePhilosophicalReferences: (v: boolean) => void;
}

const AISettingsContext = createContext<AISettings>({
  includeReflectiveQuestion:      true,
  includePhilosophicalReferences: true,
  setIncludeReflectiveQuestion:      () => {},
  setIncludePhilosophicalReferences: () => {},
});

export function AISettingsProvider({ children }: { children: React.ReactNode }) {
  const [includeReflectiveQuestion,      setIncludeReflectiveQuestion]      = useState(true);
  const [includePhilosophicalReferences, setIncludePhilosophicalReferences] = useState(true);

  const value = useMemo<AISettings>(
    () => ({
      includeReflectiveQuestion,
      includePhilosophicalReferences,
      setIncludeReflectiveQuestion,
      setIncludePhilosophicalReferences,
    }),
    [includeReflectiveQuestion, includePhilosophicalReferences],
  );

  return (
    <AISettingsContext.Provider value={value}>
      {children}
    </AISettingsContext.Provider>
  );
}

export function useAISettings(): AISettings {
  return useContext(AISettingsContext);
}
