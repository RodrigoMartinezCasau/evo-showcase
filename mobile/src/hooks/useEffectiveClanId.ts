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
import { mockCurrentUser } from '@evoconn/data/mockUser';

export function useEffectiveClanId(userId?: string): string | null {
  const { profile } = useAuth();
  const classification = useClassification();
  const { isPreviewActive, previewClanId } = usePreviewMode();

  if (isPreviewActive) return previewClanId ?? null;

  const targetId = userId ?? profile?.id ?? mockCurrentUser.id;
  // The local ClassificationContext is the sole source of truth for the
  // self-user's clan. It is heal-validated on disk load and on hydrate
  // from Supabase backup, so a dangling `profiles.clan_id` (without a
  // matching state backup) can never resurrect a ghost clan. A clean
  // reset ("Sin clan") therefore propagates immediately to the UI.
  return classification.getVisibleClanId(targetId) ?? null;
}
