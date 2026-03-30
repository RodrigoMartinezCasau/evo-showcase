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
};

export type DetailActionColumnHandle = {
  triggerUpvoteBounce: () => void;
};

export const DetailActionColumn = forwardRef<DetailActionColumnHandle, DetailActionColumnProps>(
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

  return (
    <View
      style={[
        styles.column,
        { gap: COL.gap },
      ]}
    >
      {/* Clan */}
      <TouchableOpacity onPress={onClanPress} activeOpacity={0.7}>
        <View
          style={{
            width: sz * CLAN_L.scale,
            height: sz * CLAN_L.scale,
            transform: [
              { translateX: CLAN_L.offsetX },
              { translateY: CLAN_L.offsetY },
            ],
          }}
        >
          <InsigniaIcon width={sz * CLAN_L.scale} height={sz * CLAN_L.scale} />
        </View>
      </TouchableOpacity>

      {/* Upvote count */}
      <Text
        style={{
          color: voted === 'up' ? UP_C.colorActive : UP_C.colorInactive,
          fontSize: UP_C.fontSize,
          fontWeight: UP_C.fontWeight,
          textAlign: 'center',
          minWidth: STAT_MIN_WIDTH,
          transform: [
            { translateX: UP_C.offsetX },
            { translateY: UP_C.offsetY },
          ],
        }}
      >
        {formatCount(upCount)}
      </Text>

      {/* Upvote */}
      <TouchableOpacity onPress={handleUp} activeOpacity={0.7}>
        <Animated.View
          style={{
            width: sz * UP_L.scale,
            height: sz * UP_L.scale,
            transform: [
              { translateX: UP_L.offsetX },
              { translateY: UP_L.offsetY },
              { scale: upBounce.scale },
            ],
          }}
        >
          {voted === 'up' ? (
            <UpvoteActive key="up-active" width={sz * UP_L.scale} height={sz * UP_L.scale} />
          ) : (
            <UpvoteInactive key="up-inactive" width={sz * UP_L.scale} height={sz * UP_L.scale} />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Approval percentage */}
      <Text
        style={{
          color: getApprovalColor(approvalPct),
          fontSize: APPR.fontSize,
          fontWeight: APPR.fontWeight,
          textAlign: 'center',
          minWidth: STAT_MIN_WIDTH,
          transform: [
            { translateX: APPR.offsetX },
            { translateY: APPR.offsetY },
          ],
        }}
      >
        {approvalPct}%
      </Text>

      {/* Downvote */}
      <TouchableOpacity onPress={handleDown} activeOpacity={0.7}>
        <Animated.View
          style={{
            width: sz * DOWN_L.scale,
            height: sz * DOWN_L.scale,
            transform: [
              { translateX: DOWN_L.offsetX },
              { translateY: DOWN_L.offsetY },
              { scale: downBounce.scale },
            ],
          }}
        >
          {voted === 'down' ? (
            <DownvoteActive key="down-active" width={sz * DOWN_L.scale} height={sz * DOWN_L.scale} />
          ) : (
            <DownvoteInactive key="down-inactive" width={sz * DOWN_L.scale} height={sz * DOWN_L.scale} />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Downvote count */}
      <Text
        style={{
          color: voted === 'down' ? DOWN_C.colorActive : DOWN_C.colorInactive,
          fontSize: DOWN_C.fontSize,
          fontWeight: DOWN_C.fontWeight,
          textAlign: 'center',
          minWidth: STAT_MIN_WIDTH,
          transform: [
            { translateX: DOWN_C.offsetX },
            { translateY: DOWN_C.offsetY },
          ],
        }}
      >
        {formatCount(downCount)}
      </Text>

      {/* Save */}
      <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
        <Animated.View
          style={{
            width: sz * SAVE_L.scale,
            height: sz * SAVE_L.scale,
            transform: [
              { translateX: SAVE_L.offsetX },
              { translateY: SAVE_L.offsetY },
              { scale: saveBounce.scale },
            ],
          }}
        >
          {saved ? (
            <SaveActive key="save-active" width={sz * SAVE_L.scale} height={sz * SAVE_L.scale} />
          ) : (
            <SaveInactive key="save-inactive" width={sz * SAVE_L.scale} height={sz * SAVE_L.scale} />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* More (three dots) */}
      <TouchableOpacity
        onPress={onMorePress}
        activeOpacity={0.7}
        hitSlop={8}
        style={{
          transform: [
            { translateX: MORE_L.offsetX },
            { translateY: MORE_L.offsetY },
          ],
        }}
      >
        <Text style={[styles.moreDots, { fontSize: 22 * MORE_L.scale }]}>
          ···
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const STAT_MIN_WIDTH = 40;

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  moreDots: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
