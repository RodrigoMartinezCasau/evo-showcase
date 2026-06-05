import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { PersonalBottomChipButton } from './PersonalBottomChipButton';

type Props = {
  clanId?: string | null;
};

export const PersonalSavedPostsBlock = React.memo(function PersonalSavedPostsBlock({ clanId }: Props) {
  const router = useRouter();

  const handleOpen = useCallback(() => {
    router.push('/personal-saved-posts');
  }, [router]);

  return (
    <PersonalBottomChipButton
      label="Guardados"
      clanId={clanId ?? null}
      onPress={handleOpen}
    />
  );
});
