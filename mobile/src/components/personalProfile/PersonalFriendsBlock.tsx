import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { PersonalBottomChipButton } from './PersonalBottomChipButton';

type Props = {
  clanId?: string | null;
};

export const PersonalFriendsBlock = React.memo(function PersonalFriendsBlock({ clanId }: Props) {
  const router = useRouter();

  const handleOpen = useCallback(() => {
    router.push('/personal-friends');
  }, [router]);

  return (
    <PersonalBottomChipButton
      label="Amigos"
      clanId={clanId ?? null}
      onPress={handleOpen}
    />
  );
});
