import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SIDEBAR_FOLDER_ITEM_LAYOUT as IL } from '@evoconn/constants/sidebarFolderItemLayout';

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
        hitSlop={{ top: 2, bottom: 6, left: 8, right: 0 }}
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
        /*
         * The pencil is positioned ABSOLUTELY so its layout bounds = visual bounds.
         * Using transform for the offset caused the layout slot to remain inside
         * the title's flex:1 area, making titleWrap intercept the tap instead.
         * right = -pencilOffsetX puts the pencil at the correct visual position.
         * zIndex:2 ensures it is checked before the titleWrap in hit testing.
         */
        <TouchableOpacity
          onPress={onPencilPress}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.pencilHit,
            {
              position: 'absolute',
              right: -IL.pencilOffsetX,
              width: IL.pencilSize,
              top: 0,
              bottom: 0,
              zIndex: 2,
            },
          ]}
        >
          <Text style={[styles.pencilGlyph, { fontSize: IL.pencilSize * 0.68, color: IL.pencilColor }]}>
            ✎
          </Text>
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
  },
  pencilGlyph: {
    textAlign: 'center',
  },
});
