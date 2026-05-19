/**
 * Clan visible para UI: perfil Supabase + clasificación local.
 *
 * Importante para performance:
 *   NO se suscribe a `useSimulation()` (que incluye posts, votes, follows,
 *   saves, etc.). Una suscripción ahí re-renderizaba AppTopBar, SidebarDrawer
 *   y AppAnimationLayer cada vez que cualquiera votaba/guardaba/comentaba,
 *   causando lag generalizado. En su lugar leemos `mockCurrentUser.id` como
 *   fallback no-reactivo (SimulationContext lo mantiene sincronizado vía
 *   setActiveSimUser), y dejamos que la reactividad venga de `useAuth` y
 *   `useClassification`.
 */
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { mockCurrentUser } from '@evoconn/data/mockUser';

export function useEffectiveClanId(userId?: string): string | null {
  const { profile } = useAuth();
  const classification = useClassification();
  const { isPreviewActive, previewClanId } = usePreviewMode();

  if (isPreviewActive) return previewClanId ?? null;

  const targetId = userId ?? profile?.id ?? mockCurrentUser.id;
  const visibleClan = classification.getVisibleClanId(targetId);

  if (profile?.id && targetId === profile.id && isRealUserId(profile.id)) {
    return profile.clan_id ?? visibleClan ?? null;
  }

  return visibleClan ?? null;
}
