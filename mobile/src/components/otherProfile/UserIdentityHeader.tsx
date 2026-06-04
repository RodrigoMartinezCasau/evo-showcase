import React from 'react';
import type { Rank } from '@evoconn/types';
import { PersonalIdentityHeader } from '@evoconn/components/personalProfile/PersonalIdentityHeader';

type Props = {
  username: string;
  userId: string;
  clanId: string | null;
  rank: Rank;
  avatarUri?: string | null;
  onShieldPress?: () => void;
  /** Altura frase insignia + gap (centra el avatar en el bloque conjunto). */
  companionBelowHeight?: number;
};

/** Perfil ajeno: mismo layout que personal (avatar izquierda, sin flecha compartir). */
export const UserIdentityHeader = React.memo(function UserIdentityHeader(props: Props) {
  return <PersonalIdentityHeader {...props} hideShareButton />;
});
