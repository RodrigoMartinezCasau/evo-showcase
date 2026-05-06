import React, { useMemo, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import {
  DETAIL_ACTION_COLUMN_LAYOUT as COL,
  DETAIL_CLAN_BUTTON_LAYOUT as CLAN_L,
  DETAIL_UPVOTE_BUTTON_LAYOUT as UP_L,
  DETAIL_DOWNVOTE_BUTTON_LAYOUT as DOWN_L,
  DETAIL_SAVE_BUTTON_LAYOUT as SAVE_L,
  DETAIL_MORE_BUTTON_LAYOUT as MORE_L,
  DETAIL_UPVOTE_COUNT_LAYOUT as UP_C,
  DETAIL_DOWNVOTE_COUNT_LAYOUT as DOWN_C,
  DETAIL_APPROVAL_PERCENT_LAYOUT as APPR,
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

function getApprovalColor(pct: number): string {
  if (pct < 10) return APPR.colorBelow10;
  if (pct < 50) return APPR.colorBelow50;
  if (pct > 95) return APPR.colorAbove95;
  if (pct > 90) return APPR.colorAbove90;
  if (pct > 80) return APPR.colorAbove80;
  if (pct > 70) return APPR.colorAbove70;
  return APPR.colorAbove50;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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

  // Measurement-based layout: fill panel height with space-between (6 items).
  const columnStyle = containerHeight != null
    ? [styles.column, { height: containerHeight, justifyContent: 'space-between' as const }]
    : [styles.column, { gap: COL.gap }];

  return (
    <View style={styles.root}>
      {/* ── 6-item column: clan / upvote+count / approval% / downvote+count / save / dots ── */}
      <View style={columnStyle}>

        {/* 1. Clan */}
        <TouchableOpacity onPress={onClanPress} activeOpacity={0.7}>
          <View style={{ width: sz * CLAN_L.scale, height: sz * CLAN_L.scale }}>
            <InsigniaIcon width={sz * CLAN_L.scale} height={sz * CLAN_L.scale} />
          </View>
        </TouchableOpacity>

        {/* 2. Upvote + count below */}
        <TouchableOpacity onPress={handleUp} activeOpacity={0.7}>
          <View style={styles.iconWithStat}>
            <Animated.View
              style={{
                width: sz * UP_L.scale,
                height: sz * UP_L.scale,
                transform: [{ scale: upBounce.scale }],
              }}
            >
              {voted === 'up' ? (
                <UpvoteActive key="up-a" width={sz * UP_L.scale} height={sz * UP_L.scale} />
              ) : (
                <UpvoteInactive key="up-i" width={sz * UP_L.scale} height={sz * UP_L.scale} />
              )}
            </Animated.View>
            <Text style={[styles.statText, { color: voted === 'up' ? UP_C.colorActive : UP_C.colorInactive }]}>
              {formatCount(upCount)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. Approval % */}
        <Text style={[styles.approvalText, { color: getApprovalColor(approvalPct) }]}>
          {approvalPct}%
        </Text>

        {/* 4. Downvote + count below */}
        <TouchableOpacity onPress={handleDown} activeOpacity={0.7}>
          <View style={styles.iconWithStat}>
            <Animated.View
              style={{
                width: sz * DOWN_L.scale,
                height: sz * DOWN_L.scale,
                transform: [{ scale: downBounce.scale }],
              }}
            >
              {voted === 'down' ? (
                <DownvoteActive key="down-a" width={sz * DOWN_L.scale} height={sz * DOWN_L.scale} />
              ) : (
                <DownvoteInactive key="down-i" width={sz * DOWN_L.scale} height={sz * DOWN_L.scale} />
              )}
            </Animated.View>
            <Text style={[styles.statText, { color: voted === 'down' ? DOWN_C.colorActive : DOWN_C.colorInactive }]}>
              {formatCount(downCount)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 5. Save */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Animated.View
            style={{
              width: sz * SAVE_L.scale,
              height: sz * SAVE_L.scale,
              transform: [{ scale: saveBounce.scale }],
            }}
          >
            {saved ? (
              <SaveActive key="save-a" width={sz * SAVE_L.scale} height={sz * SAVE_L.scale} />
            ) : (
              <SaveInactive key="save-i" width={sz * SAVE_L.scale} height={sz * SAVE_L.scale} />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* 6. More (three dots) */}
        <TouchableOpacity onPress={onMorePress} activeOpacity={0.7} hitSlop={8}>
          <Text style={[styles.moreDots, { fontSize: 22 * MORE_L.scale }]}>···</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}));

const COL_FIXED_WIDTH = COL.iconSize * CLAN_L.scale;

const styles = StyleSheet.create({
  root: {
    width: COL_FIXED_WIDTH,
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: COL_FIXED_WIDTH,
  },
  iconWithStat: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  approvalText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  moreDots: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
