import React, { useCallback } from 'react';
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
  USERNAME_FONT_SIZE,
  CLAN_OFFSET_X,
  CLAN_OFFSET_Y,
  CLAN_FONT_SIZE,
  RANK_OFFSET_X,
  RANK_OFFSET_Y,
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

// Explicit line-heights prevent text-measurement variance across remounts.
const USERNAME_LINE_HEIGHT = Math.ceil(USERNAME_FONT_SIZE * 1.3);
const CLAN_LINE_HEIGHT = Math.ceil(CLAN_FONT_SIZE * 1.3);
const RANK_LINE_HEIGHT = Math.ceil(RANK_FONT_SIZE * 1.3);

// Deterministic row heights so the container never reflows.
const USERNAME_ROW_HEIGHT = USERNAME_LINE_HEIGHT;
const USERNAME_ROW_MARGIN_BOTTOM = 4;
const CLAN_ROW_HEIGHT = Math.max(CLAN_LINE_HEIGHT, RANK_LINE_HEIGHT + 6); // 6 = pill paddingV*2
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
  userId: string;
  clanId: string | null;
  rank: Rank;
  avatarUri?: string | null;
  onShieldPress?: () => void;
  /** Captura PNG: oculta la flecha de compartir. */
  hideShareButton?: boolean;
  /** Si se define, sustituye el Share nativo (p. ej. exportar PNG del perfil). */
  onSharePress?: () => void;
};

export const PersonalIdentityHeader = React.memo(function PersonalIdentityHeader({
  username,
  userId,
  clanId,
  rank,
  avatarUri,
  onShieldPress,
  hideShareButton = false,
  onSharePress,
}: Props) {
  const { width: screenW } = useWindowDimensions();

  // Render the SVG at its true display size so it is not GPU-upscaled from a
  // small rasterisation. `SHIELD_SCALE` is a transform that would otherwise
  // cause the GPU compositing layer (sized SHIELD_BASE_SIZE) to be scaled up,
  // producing a blurry result. By rendering the SVG at the final pixel size
  // directly and removing the scale transform, we get a crisp vector output.
  const preferredShieldSize = Math.round(SHIELD_BASE_SIZE * SHIELD_SCALE);
  // Keep a guaranteed safe text column so the badge cannot invade username /
  // clan / rank lines on narrow devices.
  const maxShieldSizeByWidth = Math.max(
    BADGE_MIN_SIZE,
    screenW - 20 * 2 - TEXT_MIN_WIDTH - TEXT_BADGE_SAFE_GAP,
  );
  const shieldDisplaySize = Math.min(preferredShieldSize, maxShieldSizeByWidth);
  const maxLeftShift = Math.max(0, screenW - 20 * 2 - TEXT_MIN_WIDTH - shieldDisplaySize);
  // Clamp only to prevent the badge from going off-screen to the left.
  // autoBadgePushRight is intentionally removed so the badge stays exactly
  // where the editor constants place it across all renders and reloads.
  // Base X (collision clamp) + relative X are summed before clamp so both editors work.
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
  // Container height is always TEXT-ONLY height. The badge is absolute and
  // overflows visually without pushing sibling components down — so we must
  // NOT expand containerHeight to accommodate the badge size.
  const containerHeight = CONTAINER_HEIGHT;
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


  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Text column — username + clan+rank row */}
      <View style={styles.textBlock}>
        {/* Username row */}
        <ProfileUsernameRow
          username={username}
          userId={userId}
          usernameMaxWidth={usernameMaxWidth}
          hideShareButton={hideShareButton}
          onSharePress={handleShare}
          rowStyle={{
            height: USERNAME_ROW_HEIGHT,
            marginBottom: USERNAME_ROW_MARGIN_BOTTOM,
            transform: [{ translateX: USERNAME_OFFSET_X }, { translateY: USERNAME_OFFSET_Y }],
          }}
        />

        {/* Clan + rank row — inline, same baseline */}
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

      {/* Shield — absolute, does not affect layout height */}
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
        <UserAvatarFrame
          clanId={clanId}
          avatarUri={avatarUri ?? null}
          size={shieldDisplaySize}
          noPhotoFallback="by-clan"
        />
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
