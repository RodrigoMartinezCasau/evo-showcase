import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { buildProfileShareMessage } from '@evoconn/utils/appShareLinks';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import type { Rank } from '@evoconn/types';
import {
  SHIELD_OFFSET_X,
  SHIELD_OFFSET_Y,
  SHIELD_RELATIVE_OFFSET_X,
  SHIELD_RELATIVE_OFFSET_Y,
  SHIELD_SCALE,
  SHIELD_BASE_SIZE,
  USERNAME_OFFSET_X,
  USERNAME_OFFSET_Y,
  USERNAME_FONT_SIZE,
  CLAN_OFFSET_X,
  CLAN_OFFSET_Y,
  CLAN_FONT_SIZE,
  RANK_FONT_SIZE,
  CLAN_ROW_SCALE,
  CLAN_ROW_OFFSET_X,
  CLAN_ROW_MARGIN_BOTTOM,
  SHARE_BUTTON_SIZE,
  PROFILE_SHARE_ARROW_FONT_SIZE,
  PROFILE_TESTER_BADGE_RESERVE,
} from '@evoconn/constants/personalProfileLayout';
import { ProfileUsernameRow } from '@evoconn/components/shared/ProfileUsernameRow';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

const USERNAME_LINE_HEIGHT = Math.ceil(USERNAME_FONT_SIZE * 1.3);
const CLAN_LINE_HEIGHT = Math.ceil(CLAN_FONT_SIZE * 1.3);
const RANK_LINE_HEIGHT = Math.ceil(RANK_FONT_SIZE * 1.3);

const USERNAME_ROW_HEIGHT = USERNAME_LINE_HEIGHT;
const USERNAME_ROW_MARGIN_BOTTOM = 4;
const CLAN_ROW_HEIGHT = Math.max(CLAN_LINE_HEIGHT, RANK_LINE_HEIGHT + 6);
const CONTAINER_HEIGHT = USERNAME_ROW_HEIGHT + USERNAME_ROW_MARGIN_BOTTOM + CLAN_ROW_HEIGHT;
const TEXT_BADGE_SAFE_GAP = 14;
const TEXT_MIN_WIDTH = 165;
const BADGE_MIN_SIZE = 86;
const MIN_RESERVED_RIGHT_SPACE = 96;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type Props = {
  username: string;
  /** Id de perfil (Supabase o sim); el enlace compartido abre la app en `/profile/[id]`. */
  userId: string;
  clanId: string | null;
  rank: Rank;
  onShieldPress?: () => void;
};

export const UserIdentityHeader = React.memo(function UserIdentityHeader({
  username,
  userId,
  clanId,
  rank,
  onShieldPress,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const ShieldSvg = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);

  const preferredShieldSize = Math.round(SHIELD_BASE_SIZE * SHIELD_SCALE);
  const maxShieldSizeByWidth = Math.max(
    BADGE_MIN_SIZE,
    screenW - 20 * 2 - TEXT_MIN_WIDTH - TEXT_BADGE_SAFE_GAP,
  );
  const shieldDisplaySize = Math.min(preferredShieldSize, maxShieldSizeByWidth);
  const maxLeftShift = Math.max(0, screenW - 20 * 2 - TEXT_MIN_WIDTH - shieldDisplaySize);
  const combinedShieldOffsetX = SHIELD_OFFSET_X + SHIELD_RELATIVE_OFFSET_X;
  const clampedShieldOffsetX = clamp(combinedShieldOffsetX, -maxLeftShift, 24);
  const reservedRightSpace = Math.max(
    MIN_RESERVED_RIGHT_SPACE,
    shieldDisplaySize + TEXT_BADGE_SAFE_GAP + Math.max(0, -clampedShieldOffsetX),
  );
  const shareReserve =
    Math.max(SHARE_BUTTON_SIZE, PROFILE_SHARE_ARROW_FONT_SIZE) +
    PROFILE_TESTER_BADGE_RESERVE +
    14;
  const usernameMaxWidth = Math.max(120, screenW - 20 * 2 - shareReserve);
  const containerHeight = CONTAINER_HEIGHT;
  const clanLabel = clanId
    ? `Clan ${clanId.charAt(0).toUpperCase() + clanId.slice(1)}`
    : 'Sin clan';

  const handleShare = useCallback(() => {
    Share.share({
      message: buildProfileShareMessage(username, userId),
    }).catch(() => {});
  }, [username, userId]);

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <View style={styles.textBlock}>
        <ProfileUsernameRow
          username={username}
          userId={userId}
          usernameMaxWidth={usernameMaxWidth}
          onSharePress={handleShare}
          rowStyle={{
            height: USERNAME_ROW_HEIGHT,
            marginBottom: USERNAME_ROW_MARGIN_BOTTOM,
            transform: [{ translateX: USERNAME_OFFSET_X }, { translateY: USERNAME_OFFSET_Y }],
          }}
        />

        <View
          style={[
            styles.clanRankRow,
            {
              paddingRight: reservedRightSpace,
              marginBottom: CLAN_ROW_MARGIN_BOTTOM,
              transform: [{ translateX: CLAN_ROW_OFFSET_X }, { scale: CLAN_ROW_SCALE }],
            },
          ]}
        >
          <Text
            style={[
              styles.clanName,
              {
                fontSize: CLAN_FONT_SIZE,
                lineHeight: CLAN_LINE_HEIGHT,
                transform: [{ translateX: CLAN_OFFSET_X }, { translateY: CLAN_OFFSET_Y }],
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {clanLabel}
            {'  '}
            <Text style={[styles.rankInline, { fontSize: RANK_FONT_SIZE, lineHeight: RANK_LINE_HEIGHT }]}>
              {'— '}
              {RANK_LABELS[rank]}
            </Text>
          </Text>
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
            right: -clampedShieldOffsetX,
            top: '50%',
            marginTop: -shieldDisplaySize / 2 + SHIELD_OFFSET_Y + SHIELD_RELATIVE_OFFSET_Y,
          },
        ]}
      >
        <ShieldSvg width={shieldDisplaySize} height={shieldDisplaySize} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 20,
  },
  textBlock: {},
  clanRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clanName: {
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  rankInline: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
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
