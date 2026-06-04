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
  usernameMaxWidth: number;
  usernameFontSize?: number;
  usernameLineHeight?: number;
  /** Escala mínima al ajustar fuente en pantallas estrechas (default 0.72). */
  usernameMinimumFontScale?: number;
  rowStyle?: ViewStyle;
  hideShareButton?: boolean;
  /** Tamaño de la insignia 100 primeros (perfil personal usa constante mayor). */
  testerBadgeIconSize?: number;
  onSharePress: () => void;
};

/**
 * Fila: @username · flecha compartir · insignia 100 primeros (si aplica).
 */
export function ProfileUsernameRow({
  username,
  userId,
  usernameMaxWidth,
  usernameFontSize = USERNAME_FONT_SIZE,
  usernameLineHeight = USERNAME_LINE_HEIGHT,
  usernameMinimumFontScale = 0.72,
  rowStyle,
  hideShareButton = false,
  testerBadgeIconSize,
  onSharePress,
}: Props) {
  return (
    <View style={[styles.usernameRow, rowStyle]}>
      <Text
        style={[
          styles.username,
          {
            fontSize: usernameFontSize,
            lineHeight: usernameLineHeight,
            maxWidth: usernameMaxWidth,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={usernameMinimumFontScale}
      >
        {username}
      </Text>
      {!hideShareButton ? (
        <TouchableOpacity
          onPress={onSharePress}
          hitSlop={8}
          activeOpacity={0.6}
          accessibilityLabel="Compartir perfil"
        >
          <Text style={styles.shareInline}>↗</Text>
        </TouchableOpacity>
      ) : null}
      <FirstUsersTesterBadge userId={userId} iconSize={testerBadgeIconSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 3,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.6,
    flexShrink: 1,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  shareInline: {
    fontSize: PROFILE_SHARE_ARROW_FONT_SIZE,
    lineHeight: SHARE_LINE_HEIGHT,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginLeft: 5,
    flexShrink: 0,
    zIndex: 10,
    elevation: 10,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
