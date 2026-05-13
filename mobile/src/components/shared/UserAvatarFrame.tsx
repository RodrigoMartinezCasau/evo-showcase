/**
 * UserAvatarFrame
 *
 * Renders a user's profile picture inside a circular frame with the clan color
 * as a border ring. Falls back to the clan SVG icon when no photo is set.
 *
 * Usage:
 *   <UserAvatarFrame
 *     clanId={user.clanId}
 *     avatarUri={user.avatarUri}
 *     size={60}
 *   />
 */
import React, { useMemo } from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';
import { getClanProfileByHouse } from '@evoconn/utils/getClanProfileByHouse';

type Props = {
  clanId?: string | null;
  avatarUri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Extra scale/offset applied to the fallback SVG icon (matches SettingsScreen constants). */
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
};

const DEFAULT_SIZE = 60;
const RING_WIDTH = 2.5;

export function UserAvatarFrame({
  clanId,
  avatarUri,
  size = DEFAULT_SIZE,
  style,
  iconScale = 1,
  iconOffsetX = 0,
  iconOffsetY = 0,
}: Props) {
  const clanColor = useMemo(() => {
    if (!clanId) return '#555';
    return CLAN_TO_COLOR[clanId as keyof typeof CLAN_TO_COLOR] ?? '#555';
  }, [clanId]);

  const ClanSvg = useMemo(() => getClanProfileByHouse(clanId), [clanId]);

  if (avatarUri) {
    const outerSize = size;
    const innerSize = outerSize - RING_WIDTH * 2;
    return (
      <View
        style={[
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: RING_WIDTH,
            borderColor: clanColor,
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
          },
          style,
        ]}
      >
        <Image
          source={{ uri: avatarUri }}
          style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback: existing clan SVG
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={{
          transform: [
            { translateX: iconOffsetX },
            { translateY: iconOffsetY },
            { scale: iconScale },
          ],
        }}
      >
        <ClanSvg width={size} height={size} />
      </View>
    </View>
  );
}
