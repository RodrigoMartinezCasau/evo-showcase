import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';

type Props = {
  /** Cierra el drawer antes de navegar (p. ej. `onClose`). */
  onBeforeNavigate?: () => void;
};

/**
 * Campana blanca + badge de no leídas (misma fuente de datos que el perfil),
 * sin el SVG personalizado del perfil.
 */
export const SidebarHeaderNotificationsButton = React.memo(function SidebarHeaderNotificationsButton({
  onBeforeNavigate,
}: Props) {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const badgeColor = getClanSecondaryColor(activeClan);
  const iconPx = SH.SIDEBAR_HEADER_NOTIFY_ICON_PX;

  return (
    <TouchableOpacity
      onPress={() => {
        onBeforeNavigate?.();
        router.push('/notifications');
      }}
      hitSlop={10}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel="Notificaciones"
      style={styles.touch}
    >
      <Ionicons name="notifications-outline" size={iconPx} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '+99' : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  touch: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
