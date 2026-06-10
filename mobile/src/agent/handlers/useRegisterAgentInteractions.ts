/**
 * Registra el puente de interacciones del agente con los stores reales de Evo.
 * Montar una sola vez en un componente que viva bajo FeedProvider y
 * PersonalProfileProvider (VoiceAssistantLayer).
 */
import { useEffect, useRef } from 'react';

import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { setAgentInteractionBridge, type AgentInteractionBridge } from './interactionBridge';

export function useRegisterAgentInteractions(): void {
  const { getMyVote, updatePostVote, updatePostSaveToggle, getPostById } = useFeedStore();
  const { savePost, unsavePost, isSaved } = usePersonalProfile();

  // Las funciones de los contextos pueden cambiar de identidad entre renders;
  // el puente lee siempre la versión más reciente vía ref.
  const fnsRef = useRef({ getMyVote, updatePostVote, updatePostSaveToggle, getPostById, savePost, unsavePost, isSaved });
  fnsRef.current = { getMyVote, updatePostVote, updatePostSaveToggle, getPostById, savePost, unsavePost, isSaved };

  useEffect(() => {
    const bridge: AgentInteractionBridge = {
      getMyVote: (postId) => fnsRef.current.getMyVote(postId),
      setVote: (postId, to) => {
        const from = fnsRef.current.getMyVote(postId);
        fnsRef.current.updatePostVote(postId, from, to);
      },
      isSaved: (postId) => fnsRef.current.isSaved(postId),
      savePost: (postId) => {
        const post = fnsRef.current.getPostById(postId);
        if (!post) return false;
        // Mismo flujo que el botón de guardar de la UI (ReflectionDetailItem).
        fnsRef.current.updatePostSaveToggle(postId, false, true);
        fnsRef.current.savePost(post);
        return true;
      },
      unsavePost: (postId) => {
        fnsRef.current.updatePostSaveToggle(postId, true, false);
        fnsRef.current.unsavePost(postId);
      },
    };
    setAgentInteractionBridge(bridge);
    return () => setAgentInteractionBridge(null);
  }, []);
}
