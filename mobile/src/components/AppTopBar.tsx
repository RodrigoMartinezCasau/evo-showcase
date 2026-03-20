import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOP_BAR_LAYOUT, type TopBarItemKey } from '@evoconn/constants/topBarLayout';
import { mockCurrentUser, mockUserStats } from '@evoconn/data/mockUser';
import { topBarIcons, topBarIconFrameScale } from '@evoconn/assets/icons/topbar';

type AppTopBarProps = {
  onMenuPress: () => void;
  onClanPress?: () => void;
  showClanIcon?: boolean;
  clanShortLabel?: string;
  showCounters?: boolean;
  counts?: {
    pencil?: number;
    fire?: number;
    heart?: number;
  };
};

function nudgeStyle(key: TopBarItemKey) {
  const o = TOP_BAR_LAYOUT.PER_ITEM_OFFSETS[key];
  if (!o) return undefined;
  const dx = 'x' in o && typeof o.x === 'number' ? o.x : 0;
  const dy = 'y' in o && typeof o.y === 'number' ? o.y : 0;
  if (!dx && !dy) return undefined;
  return { transform: [{ translateX: dx }, { translateY: dy }] };
}

function iconFrame(size: number, scale: number) {
  const s = Math.round(size * scale);
  return { width: s, height: s };
}

function HamburgerIcon({
  size,
}: {
  size: number;
}) {
  // Drawn bars are more stable than a font glyph across reloads.
  const w = size;
  const h = size;
  const barH = Math.max(2, Math.round(size * 0.11));
  const gap = Math.max(2, Math.round(size * 0.16));
  const barW = Math.round(size * 0.78);

  return (
    <View style={[styles.hamburgerFrame, { width: w, height: h }]}>
      <View style={[styles.hamburgerBar, { width: barW, height: barH, marginBottom: gap }]} />
      <View style={[styles.hamburgerBar, { width: barW, height: barH, marginBottom: gap }]} />
      <View style={[styles.hamburgerBar, { width: barW, height: barH }]} />
    </View>
  );
}

export function AppTopBar({
  onMenuPress,
  onClanPress,
  showClanIcon = true,
  clanShortLabel,
  showCounters = true,
  counts,
}: AppTopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleClanPress = () => (onClanPress ? onClanPress() : router.push('/profile'));
  const clanLabel =
    clanShortLabel ??
    (mockCurrentUser.clanId ? mockCurrentUser.clanId.slice(0, 2).toUpperCase() : '??');

  const pencilCount = counts?.pencil ?? mockUserStats.unlockedPhrases;
  const fireCount = counts?.fire ?? mockUserStats.streak;
  const heartCount = counts?.heart ?? mockUserStats.dailyUsesLeft;
  const shieldFrame = iconFrame(TOP_BAR_LAYOUT.SHIELD_SIZE, topBarIconFrameScale.shield);
  const counterIconFrame = iconFrame(TOP_BAR_LAYOUT.COUNTER_ICON_SIZE, 1);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + TOP_BAR_LAYOUT.SAFE_TOP_OFFSET,
          paddingHorizontal: TOP_BAR_LAYOUT.TOPBAR_PADDING_HORIZONTAL,
          paddingBottom: TOP_BAR_LAYOUT.TOPBAR_PADDING_BOTTOM,
          minHeight: TOP_BAR_LAYOUT.TOPBAR_MIN_HEIGHT + insets.top,
        },
      ]}
    >
      <View
        style={[
          styles.barRow,
          {
            transform: [{ translateY: TOP_BAR_LAYOUT.TOPBAR_WHOLE_SHIFT_Y }],
          },
        ]}
      >
      <View style={[styles.leftCluster, { gap: TOP_BAR_LAYOUT.LEFT_CLUSTER_GAP }]}>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={14}>
          <View
            style={[
              styles.iconFrame,
              iconFrame(TOP_BAR_LAYOUT.STAR_SIZE, topBarIconFrameScale.evoStar),
              nudgeStyle('star'),
            ]}
          >
            <Image source={topBarIcons.evoStar} style={styles.iconImage} resizeMode="contain" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={14}>
          <View style={[styles.iconFrame, nudgeStyle('menu')]}>
            <HamburgerIcon size={TOP_BAR_LAYOUT.MENU_SIZE} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.centerCluster} pointerEvents="box-none">
        {showClanIcon && (
          <TouchableOpacity onPress={handleClanPress} style={styles.centerPress} hitSlop={12}>
            <View
              style={[
                styles.iconFrame,
                iconFrame(TOP_BAR_LAYOUT.SHIELD_SIZE, topBarIconFrameScale.shield),
                nudgeStyle('shield'),
              ]}
            >
              <Image source={topBarIcons.shield} style={styles.iconImage} resizeMode="contain" />
            </View>
            <View style={[styles.textBox, { height: shieldFrame.height }, nudgeStyle('clanLabel')]}>
              <Text
                style={[styles.clanLabel, { fontSize: TOP_BAR_LAYOUT.COUNTER_TEXT_SIZE + 1 }]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {clanLabel}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.rightCluster, { gap: TOP_BAR_LAYOUT.RIGHT_CLUSTER_GAP }]}>
        <TouchableOpacity onPress={() => router.push('/phrases-domains')} style={styles.counterBtn} hitSlop={14}>
          <View
            style={[
              styles.iconFrame,
              iconFrame(TOP_BAR_LAYOUT.COUNTER_ICON_SIZE, topBarIconFrameScale.pencil),
              nudgeStyle('pencilIcon'),
            ]}
          >
            <Image source={topBarIcons.pencil} style={styles.iconImage} resizeMode="contain" />
          </View>
          {showCounters && (
            <View style={[styles.textBox, { height: counterIconFrame.height }, nudgeStyle('pencilText')]}>
              <Text style={[styles.counterText, { fontSize: TOP_BAR_LAYOUT.COUNTER_TEXT_SIZE }]}>
                {pencilCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/streak')} style={styles.counterBtn} hitSlop={14}>
          <View
            style={[
              styles.iconFrame,
              iconFrame(TOP_BAR_LAYOUT.COUNTER_ICON_SIZE, topBarIconFrameScale.fire),
              nudgeStyle('fireIcon'),
            ]}
          >
            <Image source={topBarIcons.fire} style={styles.iconImage} resizeMode="contain" />
          </View>
          {showCounters && (
            <View style={[styles.textBox, { height: counterIconFrame.height }, nudgeStyle('fireText')]}>
              <Text style={[styles.counterText, { fontSize: TOP_BAR_LAYOUT.COUNTER_TEXT_SIZE }]}>
                {fireCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/daily-uses')} style={styles.counterBtn} hitSlop={14}>
          <View
            style={[
              styles.iconFrame,
              iconFrame(TOP_BAR_LAYOUT.COUNTER_ICON_SIZE, topBarIconFrameScale.heart),
              nudgeStyle('heartIcon'),
            ]}
          >
            <Image source={topBarIcons.heart} style={styles.iconImage} resizeMode="contain" />
          </View>
          {showCounters && (
            <View style={[styles.textBox, { height: counterIconFrame.height }, nudgeStyle('heartText')]}>
              <Text style={[styles.counterText, { fontSize: TOP_BAR_LAYOUT.COUNTER_TEXT_SIZE }]}>
                {heartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: evoconnColors.background,
    borderBottomWidth: 1,
    borderBottomColor: evoconnColors.border,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  leftCluster: { flexDirection: 'row', alignItems: 'flex-end' },
  centerCluster: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  rightCluster: { flexDirection: 'row', alignItems: 'flex-end' },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 6 },
  counterBtn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: TOP_BAR_LAYOUT.COUNTER_PAIR_GAP,
  },
  textBox: {
    justifyContent: 'center',
    // Don't affect icon positioning; only centers text within its own box.
  },
  iconFrame: { alignItems: 'center', justifyContent: 'center' },
  iconImage: { width: '100%', height: '100%' },
  hamburgerFrame: { alignItems: 'center', justifyContent: 'center' },
  hamburgerBar: {
    backgroundColor: evoconnColors.text,
    borderRadius: 999,
  },
  centerPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOP_BAR_LAYOUT.CENTER_CLUSTER_GAP,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clanLabel: {
    color: evoconnColors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  counterText: {
    color: evoconnColors.text,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'left',
    includeFontPadding: false,
  },
});
