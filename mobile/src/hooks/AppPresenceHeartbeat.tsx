import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../../mobile/lib/AuthContext';
import { upsertAppPresence } from '@evoconn/services/supabaseAnalytics';

const HEARTBEAT_MS = 120_000;

/**
 * Con sesión activa, envía last_seen a Supabase al entrar en primer plano
 * y cada ~2 minutos mientras la app está activa.
 */
export function AppPresenceHeartbeat() {
  const { session } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const ping = () => {
      void upsertAppPresence();
    };

    ping();

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') ping();
    };
    const sub = AppState.addEventListener('change', onAppState);

    intervalRef.current = setInterval(ping, HEARTBEAT_MS);

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.user?.id]);

  return null;
}
