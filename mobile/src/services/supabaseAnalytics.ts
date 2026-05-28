/**
 * Analytics: presencia en app y eventos IA (Supabase).
 * Métricas agregadas: ver scripts/evo-analytics.mjs + supabase_analytics_cli.sql
 */
import { countSentryMetric } from '../../mobile/lib/sentry';
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from './supabaseSocial';

const PRESENCE_PING_SECONDS = 300;

/** Actualiza presencia + tiempo activo estimado del día (RPC analytics_record_presence_ping).
 *
 * Antes había un fallback `supabase.from('user_app_presence').upsert(...)`
 * pero la tabla tiene RLS y NO tiene políticas para `authenticated` (sólo
 * el RPC `security definer` puede escribir). El fallback fallaba siempre
 * con `new row violates row-level security policy for table "user_app_presence"`
 * y, en horas pico, generaba miles de queries fallidas que saturaban el
 * pool de conexiones de PostgREST. Eliminado.
 */
export async function upsertAppPresence(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isRealUserId(user.id)) return;

  const { error } = await supabase.rpc('analytics_record_presence_ping', {
    p_increment_seconds: PRESENCE_PING_SECONDS,
  });

  if (error && __DEV__) {
    console.warn('[Analytics] analytics_record_presence_ping:', error.message);
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

  countSentryMetric('evo.ai_usage', 1, {
    source: params.source,
    ...(params.model ? { model: params.model } : {}),
  });
}
