/**
 * Analytics: presencia en app y eventos IA (Supabase).
 * Métricas agregadas: ver scripts/evo-analytics.mjs + supabase_analytics_cli.sql
 */
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from './supabaseSocial';

const PRESENCE_PING_SECONDS = 120;

/** Actualiza presencia + tiempo activo estimado del día (RPC analytics_record_presence_ping). */
export async function upsertAppPresence(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isRealUserId(user.id)) return;

  const { error } = await supabase.rpc('analytics_record_presence_ping', {
    p_increment_seconds: PRESENCE_PING_SECONDS,
  });

  if (error) {
    if (__DEV__) console.warn('[Analytics] analytics_record_presence_ping:', error.message);
    const { error: fallbackErr } = await supabase.from('user_app_presence').upsert(
      { user_id: user.id, last_seen_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    if (fallbackErr && __DEV__) {
      console.warn('[Analytics] upsertAppPresence fallback:', fallbackErr.message);
    }
  }
}

/** Registra un uso de IA (tokens opcionales). Fire-and-forget. */
export async function logAiUsageEvent(
  params: {
    source: string;
    model?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isRealUserId(user.id)) return;
  const { error } = await supabase.from('ai_usage_events').insert({
    user_id: user.id,
    source: params.source,
    model: params.model ?? null,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    metadata: params.metadata ?? null,
  });
  if (error && __DEV__) console.warn('[Analytics] logAiUsageEvent:', error.message);
}
