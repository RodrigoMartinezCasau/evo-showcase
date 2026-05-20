/**
 * Bandeja de solicitudes recibidas — fuente de verdad: tabla `follow_requests`.
 * Refresca al enfocar, al volver a la app, por Realtime y cada 30s (por si Realtime no está en réplica).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { supabase } from '../../mobile/lib/supabase';
import {
  fetchIncomingFollowRequests,
  isRealUserId,
  type IncomingFollowRequest,
} from '@evoconn/services/supabaseSocial';

const POLL_MS = 30_000;

export function useIncomingFollowRequests() {
  const { session } = useAuth();
  const { activeUserId } = useSimulation();
  const viewerId = session?.user?.id ?? activeUserId;

  const [requests, setRequests] = useState<IncomingFollowRequest[]>([]);
  const viewerIdRef = useRef(viewerId);
  viewerIdRef.current = viewerId;

  const refresh = useCallback(async (): Promise<IncomingFollowRequest[]> => {
    const id = viewerIdRef.current;
    if (!isRealUserId(id)) {
      setRequests([]);
      return [];
    }
    const rows = await fetchIncomingFollowRequests(id);
    setRequests(rows);
    return rows;
  }, []);

  const removeRequester = useCallback((requesterId: string) => {
    setRequests((prev) => prev.filter((r) => r.requesterId !== requesterId));
  }, []);

  useEffect(() => {
    void refresh();
  }, [viewerId, refresh]);

  useEffect(() => {
    if (!isRealUserId(viewerId)) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [viewerId, refresh]);

  useEffect(() => {
    if (!isRealUserId(viewerId)) return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [viewerId, refresh]);

  useEffect(() => {
    if (!isRealUserId(viewerId)) return;
    const ch = supabase
      .channel(`follow_requests_inbox:${viewerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follow_requests',
          filter: `target_id=eq.${viewerId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'follow_requests',
          filter: `target_id=eq.${viewerId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [viewerId, refresh]);

  return { requests, refresh, removeRequester, viewerId };
}
