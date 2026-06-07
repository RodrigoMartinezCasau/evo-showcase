import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { MessagesBellButton } from './MessagesBellButton';
import { NotificationsBellButton } from './NotificationsBellButton';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';

type Props = {
  onBeforeNavigate?: () => void;
};

/** Mensajes + campana en una sola columna con el mismo translateY (alineados en X e Y). */
export const SidebarHeaderActionIcons = React.memo(function SidebarHeaderActionIcons({
  onBeforeNavigate,
}: Props) {
  const pathname = usePathname();

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
      <View style={styles.iconsRow}>
        <MessagesBellButton
          onPress={() => {
            onBeforeNavigate?.();
            navigateUnlessCurrent(pathname, '/messages');
          }}
          hitSlop={10}
          activeOpacity={0.65}
        />
        <NotificationsBellButton
          onPress={() => {
            onBeforeNavigate?.();
            navigateUnlessCurrent(pathname, '/notifications');
          }}
          hitSlop={10}
          activeOpacity={0.65}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  alignColumn: {
    height: SH.SIDEBAR_STAR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'visible',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SH.SIDEBAR_HEADER_ICONS_GAP,
  },
});
