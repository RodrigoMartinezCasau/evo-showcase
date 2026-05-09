import React, { useMemo, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import {
  DETAIL_ACTION_COLUMN_LAYOUT as COL,
  DETAIL_CLAN_BUTTON_LAYOUT as CLAN_L,
  DETAIL_UPVOTE_BUTTON_LAYOUT as UP_L,
  DETAIL_DOWNVOTE_BUTTON_LAYOUT as DOWN_L,
  DETAIL_SAVE_BUTTON_LAYOUT as SAVE_L,
  DETAIL_MORE_BUTTON_LAYOUT as MORE_L,
} from '@evoconn/constants/detailActionColumnLayout';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';

import UpvoteInactive from '../assets/detailActions/31.svg';
import UpvoteActive from '../assets/detailActions/32.svg';
import DownvoteInactive from '../assets/detailActions/29.svg';
import DownvoteActive from '../assets/detailActions/30.svg';
import SaveInactive from '../assets/detailActions/33.svg';
import SaveActive from '../assets/detailActions/34.svg';

function useBounce() {
  const scale = useRef(new Animated.Value(1)).current;
  const trigger = useCallback(() => {
    scale.setValue(0.7);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scale]);
  return { scale, trigger };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Same vertical gap: up (count→icon) and down (icon→count). */
const VOTE_STAT_ICON_GAP = 2;

type DetailActionColumnProps = {
  clanId: string | null | undefined;
  upCount: number;
  downCount: number;
  saved: boolean;
  voted: 'up' | 'down' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onSave: () => void;
  onClanPress: () => void;
  onMorePress: () => void;
  /**
   * When provided the column fills exactly this height using
   * `justifyContent: 'space-between'`, anchoring clan icon top to the
   * reflection panel top and three-dots bottom to the panel bottom.
   */
  containerHeight?: number;
};

export type DetailActionColumnHandle = {
  triggerUpvoteBounce: () => void;
};

export const DetailActionColumn = React.memo(forwardRef<DetailActionColumnHandle, DetailActionColumnProps>(
  function DetailActionColumn(
    {
      clanId,
      upCount,
      downCount,
      saved,
      voted,
      onUpvote,
      onDownvote,
      onSave,
      onClanPress,
      onMorePress,
      containerHeight,
    },
    ref,
  ) {
  const InsigniaIcon = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const sz = COL.iconSize;

  const upBounce = useBounce();
  const downBounce = useBounce();
  const saveBounce = useBounce();

  useImperativeHandle(ref, () => ({ triggerUpvoteBounce: upBounce.trigger }), [upBounce]);

  const handleUp = useCallback(() => { upBounce.trigger(); onUpvote(); }, [upBounce, onUpvote]);
  const handleDown = useCallback(() => { downBounce.trigger(); onDownvote(); }, [downBounce, onDownvote]);
  const handleSave = useCallback(() => { saveBounce.trigger(); onSave(); }, [saveBounce, onSave]);

  const total = upCount + downCount;
  const approvalPct = total > 0 ? Math.round((upCount / total) * 100) : 100;

  // ── Dynamic icon sizing ────────────────────────────────────────────────────
  // Solve: ICON_RATIO_SUM * effectiveSz + FIXED_H = containerHeight
  // Clan = 2.2 × other (120% bigger).  Icons fill the panel; gaps from space-between.
  // Fixed: 3 text lines (~18px) + 2× VOTE_STAT_ICON_GAP (up count↔icon, down icon↔count).
  const ICON_RATIO_SUM = 2.2 + 1 + 1 + 0.92 + 0.6; // clan + up + down + save + dots
  const FIXED_H = 3 * 18 + 2 * VOTE_STAT_ICON_GAP;

  let clanSz: number;
  let otherSz: number;
  let saveSz: number;
  let dotsFontSz: number;

  if (containerHeight && containerHeight > 0) {
    const derivedSz = Math.max(1, (containerHeight - FIXED_H) / ICON_RATIO_SUM);
    const rawClanH = derivedSz * 2.2;
    clanSz = Math.min(rawClanH, COL.maxClanW);
    const effSz = clanSz / 2.2;
    otherSz = effSz;
    saveSz = effSz * 0.92;
    dotsFontSz = Math.max(12, effSz * 0.6);
  } else {
    clanSz = sz * CLAN_L.scale;
    otherSz = sz * UP_L.scale;
    saveSz = sz * SAVE_L.scale;
    dotsFontSz = Math.max(12, 22 * MORE_L.scale);
  }
  // ──────────────────────────────────────────────────────────────────────────

  const columnStyle = containerHeight != null
    ? [styles.column, { height: containerHeight, justifyContent: 'space-between' as const }]
    : [styles.column];

  return (
    <View style={styles.root}>
      {/* ── 6-item column: clan / up block / approval% / down block / save / dots (same count↔icon gap up & down) ── */}
      <View style={columnStyle}>

        {/* 1. Clan badge */}
        <TouchableOpacity onPress={onClanPress} activeOpacity={0.7}>
          <View style={{ width: clanSz, height: clanSz }}>
            <InsigniaIcon width={clanSz} height={clanSz} />
          </View>
        </TouchableOpacity>

        {/* 2. Upvote: count then icon — gap matches down block */}
        <TouchableOpacity onPress={handleUp} activeOpacity={0.7}>
          <View style={styles.voteStack}>
            <Text style={styles.statText}>{formatCount(upCount)}</Text>
            <Animated.View
              style={{
                marginTop: VOTE_STAT_ICON_GAP,
                width: otherSz,
                height: otherSz,
                transform: [{ scale: upBounce.scale }],
              }}
            >
              {voted === 'up' ? (
                <UpvoteActive key="up-a" width={otherSz} height={otherSz} />
              ) : (
                <UpvoteInactive key="up-i" width={otherSz} height={otherSz} />
              )}
            </Animated.View>
          </View>
        </TouchableOpacity>

        {/* 3. Approval % */}
        <Text style={styles.approvalText}>
          {approvalPct}%
        </Text>

        {/* 4. Downvote: icon then count — same gap as up block */}
        <TouchableOpacity onPress={handleDown} activeOpacity={0.7}>
          <View style={styles.voteStack}>
            <Animated.View style={{ width: otherSz, height: otherSz, transform: [{ scale: downBounce.scale }] }}>
              {voted === 'down' ? (
                <DownvoteActive key="down-a" width={otherSz} height={otherSz} />
              ) : (
                <DownvoteInactive key="down-i" width={otherSz} height={otherSz} />
              )}
            </Animated.View>
            <Text style={[styles.statText, styles.statBelowIcon]}>{formatCount(downCount)}</Text>
          </View>
        </TouchableOpacity>

        {/* 5. Save */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Animated.View style={{ width: saveSz, height: saveSz, transform: [{ scale: saveBounce.scale }] }}>
            {saved ? (
              <SaveActive key="save-a" width={saveSz} height={saveSz} />
            ) : (
              <SaveInactive key="save-i" width={saveSz} height={saveSz} />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* 6. More (three dots) */}
        <TouchableOpacity onPress={onMorePress} activeOpacity={0.7} hitSlop={8}>
          <Text style={[styles.moreDots, { fontSize: dotsFontSz }]}>···</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}));

// Column width = maxClanW always (clan badge fills the full column width).
const COL_FIXED_WIDTH = COL.maxClanW;

const styles = StyleSheet.create({
  root: {
    width: COL_FIXED_WIDTH,
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: COL_FIXED_WIDTH,
  },
  voteStack: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  statBelowIcon: {
    marginTop: VOTE_STAT_ICON_GAP,
  },
  approvalText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  moreDots: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
