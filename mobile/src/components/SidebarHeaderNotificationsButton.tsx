import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import IcoNotificacionesSvg from '../assets/personalProfile/icono notificaciones.svg';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';
import { NOTIFICATIONS_ICON_SCALE } from '@evoconn/constants/personalProfileLayout';

/** Misma base que `PersonalNotificationsButton` (perfil). */
const PROFILE_NOTIFICATIONS_ICON_BASE = 28;

type Props = {
  /** Cierra el drawer antes de navegar (p. ej. `onClose`). */
  onBeforeNavigate?: () => void;
};

/**
 * Misma campana SVG que el perfil + badge; columna con altura del bloque de la estrella
 * y el mismo `translateY` base que la estrella (+ un nudge fino en layout si hace falta).
 */
export const SidebarHeaderNotificationsButton = React.memo(function SidebarHeaderNotificationsButton({
  onBeforeNavigate,
}: Props) {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const badgeColor = getClanSecondaryColor(activeClan);
  const iconSize = PROFILE_NOTIFICATIONS_ICON_BASE * NOTIFICATIONS_ICON_SCALE;

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
        <IcoNotificacionesSvg width={iconSize} height={iconSize} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '+99' : String(unreadCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
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
  },
  touch: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
