/**
 * Checkers de idempotencia de relaciones y repost (Sprint 4).
 * Como en Sprint 1: comprueban contra el estado VIVO (puente), no contra el
 * snapshot de contexto, que puede quedarse obsoleto durante el turno.
 */
import type { AgentScreenContext } from '../../core/types';
import { getFocusedPost } from '../../core/feedContext';
import { getTargetProfile } from '../../core/profileContext';
import { getAgentAppBridge } from '../appBridge';
import type { IdempotencyResult } from '../interactions/idempotency';

function targetProfileId(context: AgentScreenContext): {
  id: string;
  username: string;
} | null {
  const profile = getTargetProfile(context.profile);
  if (!profile) return null;
  return { id: profile.profile_id, username: profile.profile_username };
}

/** follow_user: ¿ya lo sigo (o hay solicitud pendiente)? */
export async function isAlreadyFollowingProfile(
  context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const bridge = getAgentAppBridge();
  const target = targetProfileId(context);
  if (!bridge || !target) return { alreadyApplied: false };
  if (bridge.isFollowing(target.id)) {
    return { alreadyApplied: true, message: `Ya sigues a ${target.username}.` };
  }
  if (bridge.isFollowPending(target.id)) {
    return {
      alreadyApplied: true,
      message: `Ya enviaste una solicitud de seguimiento a ${target.username}.`,
    };
  }
  return { alreadyApplied: false };
}

/** unfollow_user: ¿ya no lo sigo? (evita pedir confirmación para nada). */
export async function isNotFollowingProfile(
  context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const bridge = getAgentAppBridge();
  const target = targetProfileId(context);
  if (!bridge || !target) return { alreadyApplied: false };
  if (!bridge.isFollowing(target.id) && !bridge.isFollowPending(target.id)) {
    return { alreadyApplied: true, message: `No seguías a ${target.username}.` };
  }
  return { alreadyApplied: false };
}

/** block_user: ¿ya está bloqueado? */
export async function isProfileAlreadyBlocked(
  context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const bridge = getAgentAppBridge();
  const target = targetProfileId(context);
  if (!bridge || !target) return { alreadyApplied: false };
  if (bridge.isBlocked(target.id)) {
    return { alreadyApplied: true, message: `Ya tenías bloqueado a ${target.username}.` };
  }
  return { alreadyApplied: false };
}

/** repost_post: ¿ya lo reposteé? */
export async function isPostAlreadyReposted(
  context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const bridge = getAgentAppBridge();
  const post = getFocusedPost(context.feed);
  if (!bridge || !post) return { alreadyApplied: false };
  if (bridge.isReposted(post.post_id)) {
    return { alreadyApplied: true, message: 'Ya habías republicado esto.' };
  }
  return { alreadyApplied: false };
}
