import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import {
  USERNAME_FONT_SIZE,
  PROFILE_SHARE_ARROW_FONT_SIZE,
} from '@evoconn/constants/personalProfileLayout';
import { FirstUsersTesterBadge } from './FirstUsersTesterBadge';

const USERNAME_LINE_HEIGHT = Math.ceil(USERNAME_FONT_SIZE * 1.3);
const SHARE_LINE_HEIGHT = Math.ceil(PROFILE_SHARE_ARROW_FONT_SIZE * 1.25);

type Props = {
  username: string;
  userId: string;
  rowStyle?: ViewStyle;
  hideShareButton?: boolean;
  onSharePress: () => void;
};

/**
 * Fila: @username · flecha compartir · insignia 100 primeros (si aplica).
 *
 * Layout: el username se encoge con elipsis; compartir + insignia tienen
 * flexShrink: 0 para que no se corten en pantallas estrechas o con texto grande.
 */
export function ProfileUsernameRow({
  username,
  userId,
  rowStyle,
  hideShareButton = false,
  onSharePress,
}: Props) {
  return (
    <View style={[styles.usernameRow, rowStyle]}>
      <Text
        style={[
          styles.username,
          {
            fontSize: USERNAME_FONT_SIZE,
            lineHeight: USERNAME_LINE_HEIGHT,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
        allowFontScaling={false}
      >
        {username}
      </Text>
      <View style={styles.trailing}>
        {!hideShareButton ? (
          <TouchableOpacity
            onPress={onSharePress}
            hitSlop={8}
            activeOpacity={0.6}
            accessibilityLabel="Compartir perfil"
          >
            <Text style={styles.shareInline} allowFontScaling={false}>
              ↗
            </Text>
          </TouchableOpacity>
        ) : null}
        <FirstUsersTesterBadge userId={userId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    zIndex: 3,
  },
  username: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.6,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  shareInline: {
    fontSize: PROFILE_SHARE_ARROW_FONT_SIZE,
    lineHeight: SHARE_LINE_HEIGHT,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginLeft: 5,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
