import React from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { SIDEBAR_FOLDER_ITEM_LAYOUT as IL } from '@evoconn/constants/sidebarFolderItemLayout';

const PENCIL_ASSET = require('../assets/icons/topbar/pencil.png');

type Props = {
  name: string;
  titleColor: string;
  onPress: () => void;
  onPencilPress?: () => void;
};

export const SidebarFolderItem = React.memo(function SidebarFolderItem({
  name,
  titleColor,
  onPress,
  onPencilPress,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          width: '100%',
          transform: [
            { translateX: IL.rowOffsetX },
            { translateY: IL.rowOffsetY },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 8, right: 0 }}
        style={styles.titleWrap}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.title,
            {
              color: titleColor,
              fontSize: IL.titleFontSize,
              ...(IL.titleLineHeight > 0 ? { lineHeight: IL.titleLineHeight } : {}),
              transform: [
                { translateX: IL.titleOffsetX },
                { translateY: IL.titleOffsetY },
              ],
            },
          ]}
        >
          {name}
        </Text>
      </TouchableOpacity>

      {onPencilPress != null && (
        <TouchableOpacity
          onPress={onPencilPress}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 10 }}
          style={[
            styles.pencilHit,
            {
              marginLeft: IL.pencilGapLeft,
              width: IL.pencilSize,
              height: IL.pencilSize,
              transform: [
                { translateX: IL.pencilOffsetX },
                { translateY: IL.pencilOffsetY },
              ],
            },
          ]}
        >
          <Image
            source={PENCIL_ASSET}
            style={[styles.pencilImg, { tintColor: IL.pencilColor }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: 28,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  title: {
    fontWeight: '600',
  },
  pencilHit: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  pencilImg: {
    width: '100%',
    height: '100%',
  },
});
