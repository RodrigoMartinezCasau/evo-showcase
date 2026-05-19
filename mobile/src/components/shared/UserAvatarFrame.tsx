/**
 * UserAvatarFrame
 *
 * Renders a profile photo clipped to the exact inner shape of the clan badge SVG,
 * keeping the black border ring and top star decorations visible on top.
 * Falls back to the original clan SVG icon when no photo is set.
 *
 * Usage:
 *   <UserAvatarFrame clanId={user.clanId} avatarUri={user.avatarUri} size={60} />
 */
import React, { useId, useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { ClipPath, Path, Defs, Image as SvgImage } from 'react-native-svg';
import { getClanProfileByHouse } from '@evoconn/utils/getClanProfileByHouse';
import { getClanProfileFrameByHouse } from '@evoconn/utils/getClanProfileFrameByHouse';

// ─── Badge shape paths ────────────────────────────────────────────────────────
// Extracted from clan profile SVGs (600×600 viewBox). The badge outline is
// identical across all clans — only the fill colour and star tint differ.

// Inner filled area of the badge (the clan-colour region + person icon region).
// Used as ClipPath to constrain the photo to the badge's interior shape.
const BADGE_INNER_PATH =
  'M 303.476562 93.917969 C 354.980469 93.417969 407.757812 96.53125 470.261719 134.644531 ' +
  'C 471.722656 300.046875 478.4375 389.296875 447.054688 466.402344 ' +
  'C 436.945312 491.238281 409.910156 513.921875 382.714844 533.707031 ' +
  'C 352.363281 555.785156 320.40625 573.429688 301.296875 583.292969 ' +
  'C 281.875 573.566406 249.246094 556.042969 218.269531 533.9375 ' +
  'C 190.640625 514.21875 163.175781 491.546875 152.9375 466.402344 ' +
  'C 121.554688 389.296875 128.269531 300.046875 129.730469 134.644531 ' +
  'C 193.421875 95.808594 247.03125 93.308594 299.476562 93.949219 ' +
  'L 299.96875 93.957031 Z';



// ─── Component ────────────────────────────────────────────────────────────────

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

export function UserAvatarFrame({
  clanId,
  avatarUri,
  size = DEFAULT_SIZE,
  style,
  iconScale = 1,
  iconOffsetX = 0,
  iconOffsetY = 0,
}: Props) {
  const ClanSvg   = useMemo(() => getClanProfileByHouse(clanId), [clanId]);
  const FrameSvg  = useMemo(() => getClanProfileFrameByHouse(clanId), [clanId]);
  const photoClipId = useId().replace(/:/g, '_');
  const resolvedAvatar = avatarUri?.trim() || null;

  if (!resolvedAvatar) {
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

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Layer 1: full clan SVG — preserves top star decorations and base shape */}
      <ClanSvg width={size} height={size} />

      {/* Layer 2: photo clipped to the inner badge shape (replaces clan colour + person icon) */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 600 600"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <ClipPath id={photoClipId}>
            <Path d={BADGE_INNER_PATH} />
          </ClipPath>
        </Defs>
        <SvgImage
          href={{ uri: resolvedAvatar }}
          x={100}
          y={75}
          width={400}
          height={525}
          clipPath={`url(#${photoClipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </Svg>

      {/* Layer 3: frame SVG — black border + star decorations, transparent interior.
          This ensures stars always appear in front of the photo. */}
      <FrameSvg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
