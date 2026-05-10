import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export const SIDEBAR_FOLDER_VIEW_HEADER_LAYOUT = {
  arrowFontSize: 16,
  arrowOffsetX: 0,
  arrowOffsetY: 0,
  titleFontSize: 12,
  titleOffsetX: 0,
  titleOffsetY: 0,
  gap: 8,
  paddingH: 0,
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
  /*
   * The entire header row is one TouchableOpacity so both the arrow and the
   * folder title text are reliably tappable (previously the title was a plain
   * Text with no touch handler, and the narrow arrow TouchableOpacity was the
   * only hit target — making it easy to miss).
   * hitSlop provides a comfortable invisible extension around the row.
   */
  return (
    <TouchableOpacity
      onPress={onBack}
      activeOpacity={0.7}
      hitSlop={{ top: 4, bottom: 10, left: 8, right: 8 }}
      style={[styles.container, { marginBottom: HL.marginBottom, paddingHorizontal: HL.paddingH, paddingVertical: HL.paddingV }]}
    >
      <Text
        style={[
          styles.arrowText,
          {
            color: primaryColor,
            fontSize: HL.arrowFontSize,
            transform: [
              { translateX: HL.arrowOffsetX },
              { translateY: HL.arrowOffsetY },
            ],
          },
        ]}
      >
        ←
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: primaryColor,
            fontSize: HL.titleFontSize,
            marginLeft: HL.gap,
            transform: [
              { translateX: HL.titleOffsetX },
              { translateY: HL.titleOffsetY },
            ],
          },
        ]}
      >
        {folderName}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowText: {
    fontWeight: '800',
  },
  title: {
    fontWeight: '700',
    flex: 1,
  },
});
