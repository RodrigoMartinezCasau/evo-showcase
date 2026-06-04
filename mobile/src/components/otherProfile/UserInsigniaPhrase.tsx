import React from 'react';
import { PersonalInsigniaPhrase } from '@evoconn/components/personalProfile/PersonalInsigniaPhrase';

type Props = {
  phrase: string;
  clanId: string | null;
  onLayoutHeight?: (height: number) => void;
};

/** Perfil ajeno: misma tarjeta Siguiendo (estrellas + reborde clan) que el perfil personal. */
export const UserInsigniaPhrase = React.memo(function UserInsigniaPhrase(props: Props) {
  return <PersonalInsigniaPhrase {...props} />;
});
