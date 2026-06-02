import React from 'react';
import type { ClanId } from '@evoconn/constants/clanColors';
import type { Rank } from '@evoconn/types';
import { ClanBadgeWithAnimal } from '@evoconn/components/shared/ClanBadgeWithAnimal';
import { getPhilosophyClanBadgeIcon } from '@evoconn/utils/getPhilosophyClanBadgeIcon';

type Props = {
  clanId: ClanId;
  rank?: Rank | null;
  size: number;
};

/** Medalla de clan del perfil filosófico (Aprendiz / Maestro / Filósofo). */
export const PhilosophyClanBadge = React.memo(function PhilosophyClanBadge({
  clanId,
  rank,
  size,
}: Props) {
  return (
    <ClanBadgeWithAnimal
      FrameSvg={getPhilosophyClanBadgeIcon(clanId, rank)}
      clanId={clanId}
      size={size}
      showAnimal={!!rank}
    />
  );
});
