import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import type { Rank } from '@evoconn/types';
import {
  SHIELD_OFFSET_X,
  SHIELD_OFFSET_Y,
  SHIELD_SCALE,
  SHIELD_BASE_SIZE,
  USERNAME_OFFSET_X,
  USERNAME_OFFSET_Y,
  USERNAME_FONT_SIZE,
  CLAN_OFFSET_X,
  CLAN_OFFSET_Y,
  CLAN_FONT_SIZE,
  RANK_OFFSET_X,
  RANK_OFFSET_Y,
  RANK_FONT_SIZE,
  SHARE_BUTTON_OFFSET_X,
  SHARE_BUTTON_OFFSET_Y,
  SHARE_BUTTON_SIZE,
} from '@evoconn/constants/personalProfileLayout';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

// Explicit line-heights prevent text-measurement variance across remounts.
const USERNAME_LINE_HEIGHT = Math.ceil(USERNAME_FONT_SIZE * 1.3);
const CLAN_LINE_HEIGHT = Math.ceil(CLAN_FONT_SIZE * 1.3);
const RANK_LINE_HEIGHT = Math.ceil(RANK_FONT_SIZE * 1.3);

// Deterministic row heights so the container never reflows.
const USERNAME_ROW_HEIGHT = USERNAME_LINE_HEIGHT;
const USERNAME_ROW_MARGIN_BOTTOM = 4;
const CLAN_ROW_HEIGHT = Math.max(CLAN_LINE_HEIGHT, RANK_LINE_HEIGHT + 6); // 6 = pill paddingV*2
const CONTAINER_HEIGHT = USERNAME_ROW_HEIGHT + USERNAME_ROW_MARGIN_BOTTOM + CLAN_ROW_HEIGHT;

type Props = {
  username: string;
  clanId: string | null;
  rank: Rank;
  onShieldPress?: () => void;
};

export const PersonalIdentityHeader = React.memo(function PersonalIdentityHeader({
  username,
  clanId,
  rank,
  onShieldPress,
}: Props) {
  const ShieldSvg = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const clanLabel = clanId
    ? `Clan ${clanId.charAt(0).toUpperCase() + clanId.slice(1)}`
    : 'Sin clan';

  const handleShare = useCallback(() => {
    Share.share({
      message: `Mira el perfil de ${username} en Evoconn`,
      url: `https://evoconn.app/profile/${username}`,
    }).catch(() => {});
  }, [username]);

  return (
    <View style={[styles.container, { height: CONTAINER_HEIGHT }]}>
      <View style={styles.textBlock}>
        {/* Username row */}
        <View style={[styles.usernameRow, { height: USERNAME_ROW_HEIGHT, marginBottom: USERNAME_ROW_MARGIN_BOTTOM }]}>
          <Text
            style={[
              styles.username,
              {
                fontSize: USERNAME_FONT_SIZE,
                lineHeight: USERNAME_LINE_HEIGHT,
                transform: [{ translateX: USERNAME_OFFSET_X }, { translateY: USERNAME_OFFSET_Y }],
              },
            ]}
            numberOfLines={1}
          >
            {username}
          </Text>
          <View style={{ width: 10 }} />
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={10}
            activeOpacity={0.6}
            style={[
              styles.shareButton,
              {
                transform: [
                  { translateX: SHARE_BUTTON_OFFSET_X },
                  { translateY: SHARE_BUTTON_OFFSET_Y },
                ],
              },
            ]}
          >
            <ShareIcon size={SHARE_BUTTON_SIZE} />
          </TouchableOpacity>
        </View>

        {/* Clan + rank row */}
        <View style={[styles.clanRankRow, { height: CLAN_ROW_HEIGHT }]}>
          <Text
            style={[
              styles.clanName,
              {
                fontSize: CLAN_FONT_SIZE,
                lineHeight: CLAN_LINE_HEIGHT,
                transform: [{ translateX: CLAN_OFFSET_X }, { translateY: CLAN_OFFSET_Y }],
              },
            ]}
          >
            {clanLabel}
          </Text>
          <View style={{ width: 8 }} />
          <View
            style={[
              styles.rankPill,
              { transform: [{ translateX: RANK_OFFSET_X }, { translateY: RANK_OFFSET_Y }] },
            ]}
          >
            <Text style={[styles.rankText, { fontSize: RANK_FONT_SIZE, lineHeight: RANK_LINE_HEIGHT }]}>
              {RANK_LABELS[rank]}
            </Text>
          </View>
        </View>
      </View>

      {/* Shield — absolute, does not affect layout height */}
      <TouchableOpacity
        activeOpacity={onShieldPress ? 0.7 : 1}
        onPress={onShieldPress}
        disabled={!onShieldPress}
        hitSlop={8}
        style={[
          styles.shieldWrap,
          {
            width: SHIELD_BASE_SIZE,
            height: SHIELD_BASE_SIZE,
            marginTop: -SHIELD_BASE_SIZE / 2,
            transform: [
              { translateX: SHIELD_OFFSET_X },
              { translateY: SHIELD_OFFSET_Y },
              { scale: SHIELD_SCALE },
            ],
          },
        ]}
      >
        <ShieldSvg width={SHIELD_BASE_SIZE} height={SHIELD_BASE_SIZE} />
      </TouchableOpacity>
    </View>
  );
});

function ShareIcon({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.85, lineHeight: Math.ceil(size * 0.85 * 1.3), color: '#FFFFFF', opacity: 0.85 }}>↗</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 20,
  },
  textBlock: {
    paddingRight: SHIELD_BASE_SIZE + 20,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  shareButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clanRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clanName: {
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  rankText: {
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.7,
  },
  shieldWrap: {
    position: 'absolute',
    right: 0,
    top: '50%',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
