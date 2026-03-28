import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ClanId } from '@evoconn/constants/clanColors';

type DebugClanOverride = ClanId | null;

type DebugClanContextValue = {
  overrideClan: DebugClanOverride;
  setOverrideClan: (clan: DebugClanOverride) => void;
};

const Ctx = createContext<DebugClanContextValue>({
  overrideClan: null,
  setOverrideClan: () => {},
});

export function DebugClanProvider({ children }: { children: ReactNode }) {
  const [overrideClan, setRaw] = useState<DebugClanOverride>(null);
  const setOverrideClan = useCallback((c: DebugClanOverride) => setRaw(c), []);

  return (
    <Ctx.Provider value={{ overrideClan, setOverrideClan }}>
      {children}
    </Ctx.Provider>
  );
}

/**
 * Returns the debug clan override if set, otherwise `null`.
 * In production builds (`!__DEV__`) always returns `null` so the real
 * user clan is used without overhead.
 */
export function useDebugClan(): DebugClanOverride {
  const { overrideClan } = useContext(Ctx);
  return overrideClan;
}

export function useDebugClanSetter() {
  return useContext(Ctx).setOverrideClan;
}

/**
 * Resolves the active clan: debug override (if set) wins over the real value.
 * Safe to call unconditionally — in prod builds the context always yields `null`
 * so `realClan` passes through.
 */
export function useActiveClan(realClan: string | null): string | null {
  const override = useDebugClan();
  return override ?? realClan;
}
