/**
 * PersonalPostsTotalStats — aggregated stats header for the personal posts grid.
 *
 * Sits directly on the clan-colored background (no card/container).
 * Each stat item (icon + number) can be individually positioned and scaled
 * via constants in personalProfileLayout.ts.
 *
 * Reuses the SAME SVG icons and color helpers as PersonalRecentPostCard.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import {
  PERSONAL_POSTS_TOTAL_STATS_OFFSET_X,
  PERSONAL_POSTS_TOTAL_STATS_OFFSET_Y,
  PERSONAL_POSTS_TOTAL_STATS_SCALE,
  PERSONAL_POSTS_TOTAL_STATS_ITEM_GAP,
  PERSONAL_POSTS_TOTAL_STATS_ICON_SIZE,
  PERSONAL_POSTS_TOTAL_STATS_TEXT_OFFSET_Y,
  TOTAL_STATS_UPVOTES_OFFSET_X,
  TOTAL_STATS_UPVOTES_OFFSET_Y,
  TOTAL_STATS_UPVOTES_SCALE,
  TOTAL_STATS_DOWNVOTES_OFFSET_X,
  TOTAL_STATS_DOWNVOTES_OFFSET_Y,
  TOTAL_STATS_DOWNVOTES_SCALE,
  TOTAL_STATS_SAVED_OFFSET_X,
  TOTAL_STATS_SAVED_OFFSET_Y,
  TOTAL_STATS_SAVED_SCALE,
  TOTAL_STATS_PERCENTAGE_OFFSET_X,
  TOTAL_STATS_PERCENTAGE_OFFSET_Y,
  TOTAL_STATS_PERCENTAGE_SCALE,
} from '@evoconn/constants/personalProfileLayout';

// Same SVGs used in PersonalRecentPostCard
import UpvoteIcon from '../../assets/detailActions/32.svg';
import DownvoteIcon from '../../assets/detailActions/30.svg';
import {
  VOTE_RATIO_HIGH_COLOR,
  VOTE_RATIO_LOW_COLOR,
} from '@evoconn/constants/voteButtonAppearance';
import SavedIcon    from '../../assets/detailActions/34.svg';
import FlechaIcon   from '../../assets/detailActions/flecha.svg';

// ── Helpers (mirror PersonalRecentPostCard) ───────────────────────────────────

/** Compact count — max 4 visible characters (same rule as post cards). */
function compactCount(n: number): string {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M`;
  if (n >= 1_000)     return `${Math.floor(n / 1_000)}k`;
  return String(n);
}

/** Vote-ratio color (mirrors flechaColor in PersonalRecentPostCard). */
function ratioColor(pct: number): string {
  if (pct >= 90) return VOTE_RATIO_HIGH_COLOR;
  if (pct >= 50) return '#ffde59';
  return VOTE_RATIO_LOW_COLOR;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  posts: CommunityPost[];
};

export function PersonalPostsTotalStats({ posts }: Props) {
  const { totalUp, totalDown, totalSave, totalPct } = useMemo(() => {
    let up = 0, down = 0, save = 0;
    for (const p of posts) {
      up   += p.voteStats.up;
      down += p.voteStats.down;
      save += p.voteStats.save;
    }
    const pct = Math.round((up / Math.max(1, up + down)) * 100);
    return { totalUp: up, totalDown: down, totalSave: save, totalPct: pct };
  }, [posts]);

  const pctColor = ratioColor(totalPct);
  const iconSz   = PERSONAL_POSTS_TOTAL_STATS_ICON_SIZE;
  const textOffY = PERSONAL_POSTS_TOTAL_STATS_TEXT_OFFSET_Y;

  return (
    // ── Global wrapper: moves & scales the entire block ──────────────
    <View
      style={[
        styles.wrapper,
        {
          transform: [
            { translateX: PERSONAL_POSTS_TOTAL_STATS_OFFSET_X },
            { translateY: PERSONAL_POSTS_TOTAL_STATS_OFFSET_Y },
            { scale: PERSONAL_POSTS_TOTAL_STATS_SCALE },
          ],
        },
      ]}
    >
      <View style={[styles.row, { gap: PERSONAL_POSTS_TOTAL_STATS_ITEM_GAP }]}>

        {/* ── Upvotes ── */}
        <View
          style={[
            styles.item,
            {
              transform: [
                { translateX: TOTAL_STATS_UPVOTES_OFFSET_X },
                { translateY: TOTAL_STATS_UPVOTES_OFFSET_Y },
                { scale: TOTAL_STATS_UPVOTES_SCALE },
              ],
            },
          ]}
        >
          <View style={{ width: iconSz, height: iconSz, overflow: 'hidden' }}>
            <UpvoteIcon width={iconSz} height={iconSz} />
          </View>
          <Text style={[styles.count, { transform: [{ translateY: textOffY }] }]}>
            {compactCount(totalUp)}
          </Text>
        </View>

        {/* ── Downvotes ── */}
        <View
          style={[
            styles.item,
            {
              transform: [
                { translateX: TOTAL_STATS_DOWNVOTES_OFFSET_X },
                { translateY: TOTAL_STATS_DOWNVOTES_OFFSET_Y },
                { scale: TOTAL_STATS_DOWNVOTES_SCALE },
              ],
            },
          ]}
        >
          <View style={{ width: iconSz, height: iconSz, overflow: 'hidden' }}>
            <DownvoteIcon width={iconSz} height={iconSz} />
          </View>
          <Text style={[styles.count, { transform: [{ translateY: textOffY }] }]}>
            {compactCount(totalDown)}
          </Text>
        </View>

        {/* ── Saves ── */}
        <View
          style={[
            styles.item,
            {
              transform: [
                { translateX: TOTAL_STATS_SAVED_OFFSET_X },
                { translateY: TOTAL_STATS_SAVED_OFFSET_Y },
                { scale: TOTAL_STATS_SAVED_SCALE },
              ],
            },
          ]}
        >
          <View style={{ width: iconSz, height: iconSz, overflow: 'hidden' }}>
            <SavedIcon width={iconSz} height={iconSz} />
          </View>
          <Text style={[styles.count, { transform: [{ translateY: textOffY }] }]}>
            {compactCount(totalSave)}
          </Text>
        </View>

        {/* ── Percentage ── */}
        <View
          style={[
            styles.item,
            {
              transform: [
                { translateX: TOTAL_STATS_PERCENTAGE_OFFSET_X },
                { translateY: TOTAL_STATS_PERCENTAGE_OFFSET_Y },
                { scale: TOTAL_STATS_PERCENTAGE_SCALE },
              ],
            },
          ]}
        >
          <View style={{ width: iconSz, height: iconSz, overflow: 'hidden' }}>
            <FlechaIcon width={iconSz} height={iconSz} color={pctColor} />
          </View>
          <Text
            style={[
              styles.count,
              styles.pctCount,
              { color: pctColor, transform: [{ translateY: textOffY }] },
            ]}
          >
            {totalPct}%
          </Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No background, no border, no shadow — stats sit on the clan-colored bg
  wrapper: {
    marginBottom: 14,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  pctCount: {
    fontWeight: '800',
  },
});
