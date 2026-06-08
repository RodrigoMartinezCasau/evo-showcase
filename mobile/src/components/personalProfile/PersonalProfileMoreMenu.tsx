import React, { useCallback, useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { EvoActionSheetModal } from '@evoconn/components/shared/EvoActionSheetModal';
import { ShareToFriendPicker } from '@evoconn/components/messaging/ShareToFriendPicker';
import {
  THREE_DOTS_OFFSET_X,
  THREE_DOTS_OFFSET_Y,
  THREE_DOTS_SIZE,
} from '@evoconn/constants/otherProfileLayout';
import { getClanColor } from '@evoconn/constants/clanColors';
import { useAuth } from '../../../mobile/lib/AuthContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';

type Props = {
  userId: string;
  clanId: string | null | undefined;
  /** Captura PNG + enlace externo (misma acción que la flecha ↗ del username). */
  onShareProfile: () => void;
};

export const PersonalProfileMoreMenu = React.memo(function PersonalProfileMoreMenu({
  userId,
  clanId,
  onShareProfile,
}: Props) {
  const { session } = useAuth();
  const clanAccentColor = getClanColor(clanId);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shareInAppOpen, setShareInAppOpen] = useState(false);
  const canSendInApp = isRealUserId(session?.user?.id ?? '');

  const handleEditProfile = useCallback(() => {
    navigateUnlessCurrent(pathname, '/profile-editor');
  }, [pathname]);

  const pad = 8;
  const hit = Math.max(44, THREE_DOTS_SIZE + pad * 2);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={12}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Más opciones del perfil"
        style={[
          styles.button,
          {
            minWidth: hit,
            minHeight: hit,
            transform: [
              { translateX: THREE_DOTS_OFFSET_X },
              { translateY: THREE_DOTS_OFFSET_Y },
            ],
          },
        ]}
      >
        <Ionicons name="ellipsis-vertical" size={THREE_DOTS_SIZE} color="#FFFFFF" />
      </TouchableOpacity>

      <EvoActionSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        title="Tu perfil"
        accentColor={clanAccentColor}
        options={[
          {
            key: 'edit',
            label: 'Editar perfil',
            icon: 'create-outline',
            onPress: handleEditProfile,
          },
          ...(canSendInApp
            ? [{
                key: 'sendInApp',
                label: 'Enviar perfil',
                icon: 'paper-plane-outline' as const,
                onPress: () => setShareInAppOpen(true),
              }]
            : []),
          {
            key: 'share',
            label: 'Compartir perfil',
            icon: 'share-outline',
            onPress: onShareProfile,
          },
        ]}
      />

      <ShareToFriendPicker
        visible={shareInAppOpen}
        onClose={() => setShareInAppOpen(false)}
        kind="profile"
        profileUserId={userId}
        title="Enviar perfil"
      />
    </>
  );
});

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
