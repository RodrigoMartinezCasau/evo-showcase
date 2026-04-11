import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SIDEBAR_FOLDER_ITEM_LAYOUT as IL } from '@evoconn/constants/sidebarFolderItemLayout';

type Props = {
  name: string;
  titleColor: string;
  onPress: () => void;
};

export const SidebarFolderItem = React.memo(function SidebarFolderItem({
  name,
  titleColor,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      style={[
        styles.container,
        {
          transform: [
            { translateX: IL.rowOffsetX },
            { translateY: IL.rowOffsetY },
          ],
        },
      ]}
    >
      <Text
        numberOfLines={1}
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
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: 28,
  },
  title: {
    fontWeight: '600',
  },
});
