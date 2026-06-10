/**
 * Registra el puente de capacidades de app (Sprints 3+4+5) con los servicios
 * reales de Evo. Montar una sola vez bajo FollowProvider, BlockedUsersProvider
 * y SimulationProvider (VoiceAssistantLayer cumple: vive bajo todos ellos).
 */
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import { useFollowState } from '@evoconn/hooks/useFollowState';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { searchSupabaseUsers } from '@evoconn/services/supabaseSocial';
import {
  getFeedAudioStateForAgent,
  setFeedAudioPausedByAgent,
} from '@evoconn/hooks/useFeedAudio';
import { supabase } from '../../../mobile/lib/supabase';
import { setAgentAppBridge, type AgentAppBridge } from './appBridge';

export function useRegisterAgentApp(): void {
  const followState = useFollowState();
  const blockedUsers = useBlockedUsers();
  const simulation = useSimulation();
  const { recordBlockUser } = useRecommendationTaste();

  // El puente lee siempre la versión más reciente vía ref (los contexts
  // cambian de identidad entre renders).
  const stateRef = useRef({ followState, blockedUsers, simulation, recordBlockUser });
  stateRef.current = { followState, blockedUsers, simulation, recordBlockUser };

  useEffect(() => {
    const bridge: AgentAppBridge = {
      // ── Creación con prefill ────────────────────────────────────────────
      openReflectionComposer: (prefill) => {
        if (prefill?.trim()) {
          router.navigate({
            pathname: '/reflection',
            params: { prefill: prefill.trim() },
          } as never);
        } else {
          router.navigate('/reflection' as never);
        }
      },
      openPhraseComposer: (prefill, author) => {
        const params: Record<string, string> = {};
        if (prefill?.trim()) params.prefill = prefill.trim();
        if (author?.trim()) params.prefillAuthor = author.trim();
        if (Object.keys(params).length > 0) {
          router.navigate({ pathname: '/phrase', params } as never);
        } else {
          router.navigate('/phrase' as never);
        }
      },

      // ── Relaciones ──────────────────────────────────────────────────────
      isFollowing: (userId) => stateRef.current.followState.isFollowing(userId),
      isFollowPending: (userId) => stateRef.current.followState.isFollowPending(userId),
      toggleFollow: (userId) => stateRef.current.followState.toggleFollow(userId),
      isBlocked: (userId) => stateRef.current.blockedUsers.isBlocked(userId),
      blockUser: async (userId) => {
        // Mismo flujo de moderación que ProfileMoreMenu: dejar de seguir si
        // procede, bloquear en DB/estado y registrar la señal de recomendación.
        const { followState: follows, blockedUsers: blocked, recordBlockUser: record } =
          stateRef.current;
        if (follows.isFollowing(userId) || follows.isFollowPending(userId)) {
          follows.toggleFollow(userId);
        }
        const ok = await blocked.block(userId);
        if (ok) record(userId, null);
        return ok;
      },

      // ── Repost ──────────────────────────────────────────────────────────
      isReposted: (postId) => stateRef.current.simulation.isReposted(postId),
      repost: (postId) => {
        // toggleRepost solo se invoca cuando NO está reposteado (el handler
        // comprueba isReposted antes), así que aquí siempre añade.
        stateRef.current.simulation.toggleRepost(postId);
      },

      // ── Sesión ──────────────────────────────────────────────────────────
      logout: async () => {
        // Mismo flujo que Ajustes: signOut (no fatal si falla) + /welcome.
        try {
          await supabase.auth.signOut();
        } catch {
          /* non-fatal: la redirección saca al usuario igualmente */
        }
        router.replace('/welcome' as never);
      },

      // ── Música del feed ─────────────────────────────────────────────────
      // Singleton a nivel de módulo (useFeedAudio), no necesita context.
      getFeedAudioState: () => getFeedAudioStateForAgent(),
      setFeedAudioPaused: (paused) => setFeedAudioPausedByAgent(paused),

      // ── Búsqueda y perfiles ─────────────────────────────────────────────
      searchUsers: async (query) => {
        const profiles = await searchSupabaseUsers(query);
        return profiles
          .filter((p) => !stateRef.current.blockedUsers.isBlocked(p.id))
          .map((p) => ({ id: p.id, username: p.username }));
      },
      openProfile: (userId, username) => {
        router.navigate({
          pathname: `/profile/${userId}`,
          params: username ? { username } : {},
        } as never);
      },
      openSearch: (query) => {
        const params: Record<string, string> = { tab: 'search' };
        if (query?.trim()) params.searchQuery = query.trim();
        router.navigate({ pathname: '/(tabs)', params } as never);
      },
    };
    setAgentAppBridge(bridge);
    return () => setAgentAppBridge(null);
  }, []);
}
