/**
 * Sincroniza racha y usos restantes a Supabase profiles — misma fuente que la barra superior.
 */
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from './supabaseSocial';

export async function syncProfileStats(
  userId: string,
  streakDays: number,
  remainingUses: number,
  lastUsesResetDate?: string,
): Promise<void> {
  if (!isRealUserId(userId)) return;

  const payload: Record<string, number | string> = {
    streak_days: Math.max(0, Math.floor(streakDays)),
    remaining_uses: Math.max(0, Math.floor(remainingUses)),
  };
  if (lastUsesResetDate) {
    payload.last_uses_reset_date = lastUsesResetDate;
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error && __DEV__) {
    console.warn('[ProfileStatsSync]', error.message);
  }
}
