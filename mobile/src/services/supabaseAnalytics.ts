/**
 * Analytics: presencia en app y eventos IA (Supabase).
 * Métricas agregadas: ver scripts/evo-analytics.mjs + supabase_analytics_cli.sql
 */
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from './supabaseSocial';

/** Actualiza última actividad (llamar con sesión activa). */
export async function upsertAppPresence(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isRealUserId(user.id)) return;
  const { error } = await supabase.from('user_app_presence').upsert(
    { user_id: user.id, last_seen_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error && __DEV__) console.warn('[Analytics] upsertAppPresence:', error.message);
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
