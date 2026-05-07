import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationsBellButton } from './NotificationsBellButton';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';

type Props = {
  /** Cierra el drawer antes de navegar (p. ej. `onClose`). */
  onBeforeNavigate?: () => void;
};

/**
 * Misma campana + contador que `PersonalNotificationsButton` (`NotificationsBellButton`).
 * Columna con altura del bloque de la estrella + translateY compartido con el cluster.
 */
export const SidebarHeaderNotificationsButton = React.memo(function SidebarHeaderNotificationsButton({
  onBeforeNavigate,
}: Props) {
  const router = useRouter();

  return (
    <View
      style={[
        styles.alignColumn,
        {
          transform: [
            {
              translateY:
                SH.SIDEBAR_HEADER_NOTIFY_ICON_OFFSET_Y + SH.SIDEBAR_HEADER_NOTIFY_ICON_FINE_NUDGE_Y,
            },
          ],
        },
      ]}
    >
      <NotificationsBellButton
        onPress={() => {
          onBeforeNavigate?.();
          router.push('/notifications');
        }}
        hitSlop={10}
        activeOpacity={0.65}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  /** Misma altura de layout que el `View` de la estrella para centrar en Y con el cluster izquierdo. */
  alignColumn: {
    height: SH.SIDEBAR_STAR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'visible',
  },
});
