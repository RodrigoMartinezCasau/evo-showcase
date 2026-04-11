import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

export const SIDEBAR_FOLDER_VIEW_HEADER_LAYOUT = {
  arrowFontSize: 16,
  arrowOffsetX: 0,
  arrowOffsetY: 0,
  titleFontSize: 12,
  titleOffsetX: 0,
  titleOffsetY: 0,
  gap: 8,
  paddingH: 4,
  paddingV: 4,
  marginBottom: 8,
} as const;

const HL = SIDEBAR_FOLDER_VIEW_HEADER_LAYOUT;

type Props = {
  folderName: string;
  primaryColor: string;
  onBack: () => void;
};

export const SidebarFolderViewHeader = React.memo(function SidebarFolderViewHeader({
  folderName,
  primaryColor,
  onBack,
}: Props) {
  return (
    <View style={[styles.container, { marginBottom: HL.marginBottom, paddingHorizontal: HL.paddingH, paddingVertical: HL.paddingV }]}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        style={[
          styles.arrow,
          {
            transform: [
              { translateX: HL.arrowOffsetX },
              { translateY: HL.arrowOffsetY },
            ],
          },
        ]}
      >
        <Text style={[styles.arrowText, { color: primaryColor, fontSize: HL.arrowFontSize }]}>←</Text>
      </TouchableOpacity>
      <View style={[styles.gap, { width: HL.gap }]} />
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: primaryColor,
            fontSize: HL.titleFontSize,
            transform: [
              { translateX: HL.titleOffsetX },
              { translateY: HL.titleOffsetY },
            ],
          },
        ]}
      >
        {folderName}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {},
  arrowText: {
    fontWeight: '800',
  },
  gap: {},
  title: {
    fontWeight: '700',
    flex: 1,
  },
});
