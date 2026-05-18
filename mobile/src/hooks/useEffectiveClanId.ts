/**
 * Clan visible para UI: perfil Supabase + clasificación local.
 * El top bar usa clasificación; posts/search usaban solo `profiles.clan_id`
 * (a menudo null hasta persistir) → colores sin clan (verde lima).
 */
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { SIM_USERS_BY_ID } from '@evoconn/data/simulation/simulatedNetwork';

export function useEffectiveClanId(userId?: string): string | null {
  const { profile } = useAuth();
  const sim = useSimulation();
  const classification = useClassification();
  const { isPreviewActive, previewClanId } = usePreviewMode();

  if (isPreviewActive) return previewClanId ?? null;

  const targetId = userId ?? profile?.id ?? sim.activeUserId;
  const visibleClan = classification.getVisibleClanId(targetId);

  if (profile?.id && targetId === profile.id && isRealUserId(profile.id)) {
    return profile.clan_id ?? visibleClan ?? null;
  }

  return visibleClan ?? null;
}
