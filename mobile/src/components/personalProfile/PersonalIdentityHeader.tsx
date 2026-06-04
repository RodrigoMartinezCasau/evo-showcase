import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { buildProfileShareMessage } from '@evoconn/utils/appShareLinks';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
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
  CLAN_OFFSET_X,
  CLAN_OFFSET_Y,
  CLAN_ROW_SCALE,
  CLAN_ROW_OFFSET_X,
  CLAN_ROW_MARGIN_BOTTOM,
  PROFILE_IDENTITY_SECTION_GAP,
  PROFILE_HEADER_AVATAR_ON_LEFT,
  PROFILE_AVATAR_BLOCK_CENTER_Y_NUDGE,
  PROFILE_CONTENT_HORIZONTAL_PAD,
  USERNAME_FONT_SIZE,
  PROFILE_FONT_SCALE_MIN,
  PROFILE_TESTER_BADGE_SIZE_PERSONAL,
  computePersonalProfileIdentityLayout,
} from '@evoconn/constants/personalProfileLayout';
import { ProfileUsernameRow } from '@evoconn/components/shared/ProfileUsernameRow';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

const TEXT_BADGE_SAFE_GAP = 14;
const TEXT_MIN_WIDTH = 165;
const BADGE_MIN_SIZE = 86;
const MIN_RESERVED_RIGHT_SPACE = 96;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type Props = {
  username: string;
  userId: string;
  clanId: string | null;
  rank: Rank;
  avatarUri?: string | null;
  onShieldPress?: () => void;
  hideShareButton?: boolean;
  onSharePress?: () => void;
  /**
   * Altura del bloque bajo el header (marginTop frase + tarjeta) para centrar el avatar
   * en el eje Y del conjunto @usuario + clan + frase insignia.
   */
  companionBelowHeight?: number;
};

export const PersonalIdentityHeader = React.memo(function PersonalIdentityHeader({
  username,
  userId,
  clanId,
  rank,
  avatarUri,
  onShieldPress,
  hideShareButton = true,
  onSharePress,
  companionBelowHeight = 0,
}: Props) {
  const { width: screenW } = useWindowDimensions();

  const layout = useMemo(
    () => computePersonalProfileIdentityLayout(screenW, { hideShareButton }),
    [screenW, hideShareButton],
  );

  const clanLabel = clanId
    ? `Clan ${clanId.charAt(0).toUpperCase() + clanId.slice(1)}`
    : 'Sin clan';

  const handleShare = useCallback(() => {
    if (onSharePress) {
      onSharePress();
      return;
    }
    Share.share({
      message: buildProfileShareMessage(username, userId),
    }).catch(() => {});
  }, [username, userId, onSharePress]);

  const clanRowHeight = Math.max(layout.clanLineHeight, layout.rankLineHeight + 6);
  const containerHeight =
    layout.usernameLineHeight + PROFILE_IDENTITY_SECTION_GAP + clanRowHeight;

  const combinedShieldOffsetX = SHIELD_OFFSET_X + SHIELD_RELATIVE_OFFSET_X;
  const maxEdgeShift = Math.max(
    0,
    screenW - PROFILE_CONTENT_HORIZONTAL_PAD * 2 - TEXT_MIN_WIDTH - layout.avatarSize,
  );
  const clampedShieldOffsetX = clamp(combinedShieldOffsetX, -maxEdgeShift, 24);

  const reservedRightSpace = Math.max(
    MIN_RESERVED_RIGHT_SPACE,
    layout.avatarSize + TEXT_BADGE_SAFE_GAP + Math.max(0, -clampedShieldOffsetX),
  );

  const useTightTextOffsets = PROFILE_HEADER_AVATAR_ON_LEFT;
  const verticalSpan = containerHeight + companionBelowHeight;
  const avatarTop = PROFILE_HEADER_AVATAR_ON_LEFT
    ? (verticalSpan - layout.avatarSize) / 2 + PROFILE_AVATAR_BLOCK_CENTER_Y_NUDGE
    : undefined;
  const avatarVerticalNudge = PROFILE_HEADER_AVATAR_ON_LEFT
    ? undefined
    : -layout.avatarSize / 2 + SHIELD_OFFSET_Y + SHIELD_RELATIVE_OFFSET_Y;

  const textOffsetScale = useTightTextOffsets
    ? layout.usernameFontSize / USERNAME_FONT_SIZE
    : 1;
  const usernameOffsetX = useTightTextOffsets ? 0 : USERNAME_OFFSET_X * textOffsetScale;
  const usernameOffsetY = useTightTextOffsets ? 0 : USERNAME_OFFSET_Y * textOffsetScale;
  const clanOffsetX = useTightTextOffsets ? 0 : CLAN_OFFSET_X * textOffsetScale;
  const clanOffsetY = useTightTextOffsets ? 0 : CLAN_OFFSET_Y * textOffsetScale;

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <TouchableOpacity
        activeOpacity={onShieldPress ? 0.7 : 1}
        onPress={onShieldPress}
        disabled={!onShieldPress}
        hitSlop={8}
        style={[
          styles.shieldWrap,
          PROFILE_HEADER_AVATAR_ON_LEFT ? styles.shieldWrapLeft : styles.shieldWrapRight,
          {
            width: layout.avatarSize,
            height: layout.avatarSize,
            ...(PROFILE_HEADER_AVATAR_ON_LEFT
              ? { left: 0, top: avatarTop }
              : { right: -clampedShieldOffsetX, top: '50%', marginTop: avatarVerticalNudge }),
          },
        ]}
      >
        <UserAvatarFrame
          clanId={clanId}
          avatarUri={avatarUri ?? null}
          size={layout.avatarSize}
          noPhotoFallback="by-clan"
        />
      </TouchableOpacity>

      <View
        style={[
          styles.textBlock,
          PROFILE_HEADER_AVATAR_ON_LEFT && { paddingLeft: layout.textColumnPadLeft },
        ]}
      >
        <ProfileUsernameRow
          username={username}
          userId={userId}
          usernameMaxWidth={layout.usernameMaxWidth}
          usernameFontSize={layout.usernameFontSize}
          usernameLineHeight={layout.usernameLineHeight}
          usernameMinimumFontScale={PROFILE_FONT_SCALE_MIN}
          hideShareButton={hideShareButton}
          testerBadgeIconSize={PROFILE_TESTER_BADGE_SIZE_PERSONAL}
          onSharePress={handleShare}
          rowStyle={{
            height: layout.usernameLineHeight,
            marginBottom: PROFILE_IDENTITY_SECTION_GAP,
            transform: [
              { translateX: usernameOffsetX },
              { translateY: usernameOffsetY },
            ],
          }}
        />

        <View
          style={[
            styles.clanRankRow,
            {
              width: PROFILE_HEADER_AVATAR_ON_LEFT ? layout.textColumnWidth : undefined,
              paddingRight: PROFILE_HEADER_AVATAR_ON_LEFT ? 0 : reservedRightSpace,
              marginBottom: CLAN_ROW_MARGIN_BOTTOM,
              transform: [
                { translateX: useTightTextOffsets ? 0 : CLAN_ROW_OFFSET_X },
                { scale: CLAN_ROW_SCALE },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.clanName,
              {
                fontSize: layout.clanFontSize,
                lineHeight: layout.clanLineHeight,
                transform: [
                  { translateX: clanOffsetX },
                  { translateY: clanOffsetY },
                ],
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={PROFILE_FONT_SCALE_MIN}
          >
            {clanLabel}
            {'  '}
            <Text
              style={[
                styles.rankInline,
                {
                  fontSize: layout.rankFontSize,
                  lineHeight: layout.rankLineHeight,
                },
              ]}
            >
              {'— '}
              {RANK_LABELS[rank]}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: PROFILE_CONTENT_HORIZONTAL_PAD,
    overflow: 'visible',
  },
  textBlock: {
    flexShrink: 1,
    zIndex: 2,
  },
  clanRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  clanName: {
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  rankInline: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  shieldWrap: {
    position: 'absolute',
    top: '50%',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldWrapLeft: {
    left: 0,
  },
  shieldWrapRight: {
    right: 0,
  },
});
