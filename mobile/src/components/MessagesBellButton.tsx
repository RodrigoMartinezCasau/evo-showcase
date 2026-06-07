import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '@evoconn/hooks/MessagesContext';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { NOTIFICATIONS_ICON_SCALE, MESSAGES_ICON_VISUAL_SCALE } from '@evoconn/constants/personalProfileLayout';
import { formatNotificationBadgeCount } from '@evoconn/utils/formatNotificationBadgeCount';
import { NOTIFICATIONS_BELL_BASE_SIZE } from './NotificationsBellButton';

const BASE_SIZE = NOTIFICATIONS_BELL_BASE_SIZE;

export type MessagesBellButtonProps = {
  onPress: () => void;
  iconSize?: number;
  hitSlop?: number;
  activeOpacity?: number;
  touchableStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export const MessagesBellButton = React.memo(function MessagesBellButton({
  onPress,
  iconSize = BASE_SIZE * NOTIFICATIONS_ICON_SCALE * MESSAGES_ICON_VISUAL_SCALE,
  hitSlop = 12,
  activeOpacity = 0.65,
  touchableStyle,
  accessibilityLabel = 'Mensajes',
}: MessagesBellButtonProps) {
  const { unreadCount } = useMessages();
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
      <Ionicons name="chatbubble-ellipses" size={iconSize} color="#FFFFFF" />
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
