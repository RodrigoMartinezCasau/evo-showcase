import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import {
  DETAIL_ACTION_COLUMN_LAYOUT as COL,
  DETAIL_CLAN_BUTTON_LAYOUT as CLAN_L,
  DETAIL_UPVOTE_BUTTON_LAYOUT as UP_L,
  DETAIL_DOWNVOTE_BUTTON_LAYOUT as DOWN_L,
  DETAIL_SAVE_BUTTON_LAYOUT as SAVE_L,
} from '@evoconn/constants/detailActionColumnLayout';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';

import UpvoteInactive from '../assets/detailActions/31.svg';
import UpvoteActive from '../assets/detailActions/32.svg';
import DownvoteInactive from '../assets/detailActions/29.svg';
import DownvoteActive from '../assets/detailActions/30.svg';
import SaveInactive from '../assets/detailActions/33.svg';
import SaveActive from '../assets/detailActions/34.svg';

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
};

export function DetailActionColumn({
  clanId,
  saved,
  voted,
  onUpvote,
  onDownvote,
  onSave,
  onClanPress,
}: DetailActionColumnProps) {
  const InsigniaIcon = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const sz = COL.iconSize;

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

      {/* Upvote */}
      <TouchableOpacity onPress={onUpvote} activeOpacity={0.7}>
        <View
          style={{
            width: sz * UP_L.scale,
            height: sz * UP_L.scale,
            transform: [
              { translateX: UP_L.offsetX },
              { translateY: UP_L.offsetY },
            ],
          }}
        >
          {voted === 'up' ? (
            <UpvoteActive key="up-active" width={sz * UP_L.scale} height={sz * UP_L.scale} />
          ) : (
            <UpvoteInactive key="up-inactive" width={sz * UP_L.scale} height={sz * UP_L.scale} />
          )}
        </View>
      </TouchableOpacity>

      {/* Downvote */}
      <TouchableOpacity onPress={onDownvote} activeOpacity={0.7}>
        <View
          style={{
            width: sz * DOWN_L.scale,
            height: sz * DOWN_L.scale,
            transform: [
              { translateX: DOWN_L.offsetX },
              { translateY: DOWN_L.offsetY },
            ],
          }}
        >
          {voted === 'down' ? (
            <DownvoteActive key="down-active" width={sz * DOWN_L.scale} height={sz * DOWN_L.scale} />
          ) : (
            <DownvoteInactive key="down-inactive" width={sz * DOWN_L.scale} height={sz * DOWN_L.scale} />
          )}
        </View>
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity onPress={onSave} activeOpacity={0.7}>
        <View
          style={{
            width: sz * SAVE_L.scale,
            height: sz * SAVE_L.scale,
            transform: [
              { translateX: SAVE_L.offsetX },
              { translateY: SAVE_L.offsetY },
            ],
          }}
        >
          {saved ? (
            <SaveActive key="save-active" width={sz * SAVE_L.scale} height={sz * SAVE_L.scale} />
          ) : (
            <SaveInactive key="save-inactive" width={sz * SAVE_L.scale} height={sz * SAVE_L.scale} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
