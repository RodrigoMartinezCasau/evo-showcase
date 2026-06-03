import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import IcoNotificacionesSvg from '../assets/personalProfile/icono notificaciones.svg';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { NOTIFICATIONS_ICON_SCALE } from '@evoconn/constants/personalProfileLayout';
import { formatNotificationBadgeCount } from '@evoconn/utils/formatNotificationBadgeCount';

const BASE_SIZE = 28;

export const NOTIFICATIONS_BELL_BASE_SIZE = BASE_SIZE;

/** Misma campana + badge que perfil y sidebar; una sola fuente de verdad. */
export type NotificationsBellButtonProps = {
  onPress: () => void;
  /** Ancho/alto del SVG (por defecto BASE × NOTIFICATIONS_ICON_SCALE, igual que perfil). */
  iconSize?: number;
  hitSlop?: number;
  activeOpacity?: number;
  /** Estilo del TouchableOpacity (p. ej. transform del perfil). */
  touchableStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export const NotificationsBellButton = React.memo(function NotificationsBellButton({
  onPress,
  iconSize = BASE_SIZE * NOTIFICATIONS_ICON_SCALE,
  hitSlop = 12,
  activeOpacity = 0.65,
  touchableStyle,
  accessibilityLabel = 'Notificaciones',
}: NotificationsBellButtonProps) {
  const { unreadCount } = useNotifications();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const badgeColor = getClanSecondaryColor(activeClan);
  const hit = Math.max(44, iconSize + 16);

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={hitSlop}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0 ? `${accessibilityLabel}, ${unreadCount} sin leer` : accessibilityLabel
      }
      style={[styles.touch, { minWidth: hit, minHeight: hit }, touchableStyle]}
    >
      <IcoNotificacionesSvg width={iconSize} height={iconSize} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
            {formatNotificationBadgeCount(unreadCount)}
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
