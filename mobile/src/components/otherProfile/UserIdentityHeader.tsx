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
} from '@evoconn/constants/otherProfileLayout';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

type Props = {
  username: string;
  clanId: string | null;
  rank: Rank;
  onShieldPress?: () => void;
};

export const UserIdentityHeader = React.memo(function UserIdentityHeader({
  username,
  clanId,
  rank,
  onShieldPress,
}: Props) {
  const ShieldSvg = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);

  // Render at true display size so the SVG is not GPU-upscaled from a small
  // rasterisation layer. See PersonalIdentityHeader for full explanation.
  const shieldDisplaySize = Math.round(SHIELD_BASE_SIZE * SHIELD_SCALE);
  const shieldPositionCorrection = (shieldDisplaySize - SHIELD_BASE_SIZE) / 2;
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
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <View style={styles.usernameRow}>
          <Text
            style={[
              styles.username,
              {
                fontSize: USERNAME_FONT_SIZE,
                transform: [{ translateX: USERNAME_OFFSET_X }, { translateY: USERNAME_OFFSET_Y }],
              },
            ]}
            numberOfLines={1}
          >
            {username}
          </Text>
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
        <View style={styles.clanRankRow}>
          <Text
            style={[
              styles.clanName,
              {
                fontSize: CLAN_FONT_SIZE,
                transform: [{ translateX: CLAN_OFFSET_X }, { translateY: CLAN_OFFSET_Y }],
              },
            ]}
          >
            {clanLabel}
          </Text>
          <View
            style={[
              styles.rankPill,
              { transform: [{ translateX: RANK_OFFSET_X }, { translateY: RANK_OFFSET_Y }] },
            ]}
          >
            <Text style={[styles.rankText, { fontSize: RANK_FONT_SIZE }]}>{RANK_LABELS[rank]}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={onShieldPress ? 0.7 : 1}
        onPress={onShieldPress}
        disabled={!onShieldPress}
        hitSlop={8}
        style={[
          styles.shieldWrap,
          {
            width: shieldDisplaySize,
            height: shieldDisplaySize,
            marginTop: -shieldDisplaySize / 2,
            transform: [
              { translateX: SHIELD_OFFSET_X + shieldPositionCorrection },
              { translateY: SHIELD_OFFSET_Y },
            ],
          },
        ]}
      >
        <ShieldSvg width={shieldDisplaySize} height={shieldDisplaySize} />
      </TouchableOpacity>
    </View>
  );
});

function ShareIcon({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.85, color: '#FFFFFF', opacity: 0.85 }}>↗</Text>
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
    gap: 10,
    marginBottom: 4,
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
    gap: 8,
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
