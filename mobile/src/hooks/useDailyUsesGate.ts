import { useCallback } from 'react';

import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { showOutOfUsesAlert } from '@evoconn/utils/dailyUsesGate';

/** Bloquea acciones de IA cuando no quedan usos diarios. */
export function useDailyUsesGate() {
  const { remainingUses } = useDebugStats();
  const hasAiUses = remainingUses > 0;

  const blockIfNoUses = useCallback((): boolean => {
    if (hasAiUses) return false;
    showOutOfUsesAlert();
    return true;
  }, [hasAiUses]);

  return { remainingUses, hasAiUses, blockIfNoUses };
}
