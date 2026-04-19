import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import IcoNotificacionesSvg from '../../assets/personalProfile/Nuevo icono notis.svg';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import {
  NOTIFICATIONS_ICON_OFFSET_X,
  NOTIFICATIONS_ICON_OFFSET_Y,
  NOTIFICATIONS_ICON_SCALE,
} from '@evoconn/constants/personalProfileLayout';

const BASE_SIZE = 28;

export const PersonalNotificationsButton = React.memo(function PersonalNotificationsButton() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { activeUser } = useSimulation();
  const badgeColor = getClanSecondaryColor(activeUser.clanId);

  const size = BASE_SIZE * NOTIFICATIONS_ICON_SCALE;
  const hit = Math.max(44, size + 16);

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      hitSlop={12}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel="Notificaciones"
      style={[
        styles.button,
        {
          minWidth: hit,
          minHeight: hit,
          transform: [
            { translateX: NOTIFICATIONS_ICON_OFFSET_X },
            { translateY: NOTIFICATIONS_ICON_OFFSET_Y },
          ],
        },
      ]}
    >
      <IcoNotificacionesSvg width={size} height={size} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
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
