import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
} from '@evoconn/constants/debateResponseLayout';
import { PHRASE_FOLDER_MANAGER_LAYOUT as L } from '@evoconn/constants/phraseFolderManagerLayout';
import { PHRASE_FOLDER_ITEM_LAYOUT as ITEM } from '@evoconn/constants/phraseFolderItemLayout';
import { evoconnColors } from '@evoconn/theme/colors';
import type { SidebarFolder } from '@evoconn/types';
import WhiteStar from '../../assets/debate/whiteStar.svg';

const STAR_SZ = L.star.size * L.star.scale;
const HEADER_H = STAR_SZ;
const IC = SB.quoteCard;

const starBoxStyle = {
  position: 'absolute' as const,
  left: L.star.offsetX,
  top: L.star.offsetY,
  width: STAR_SZ,
  height: STAR_SZ,
};

type Props = {
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  /** Lateral izquierdo de cada carpeta: misma lógica que Cita textual (getBlockBorderColor('quote', clan)). */
  innerBorderColor: string;
  folders: SidebarFolder[];
  selectedFolderId?: string | null;
  onSelectFolder: (folder: SidebarFolder) => void;
};

function FolderItemBox({
  folder,
  selected,
  folderBorderColor,
  onPress,
}: {
  folder: SidebarFolder;
  selected: boolean;
  folderBorderColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.folderCard,
        {
          paddingVertical: ITEM.padding,
          paddingHorizontal: ITEM.padding,
          borderRadius: ITEM.borderRadius,
          borderWidth: 0,
          borderLeftWidth: ITEM.accentWidth,
          borderLeftColor: folderBorderColor || IC.accentColorFallback,
          backgroundColor: selected ? 'rgba(255,255,255,0.06)' : ITEM.backgroundColor,
        },
      ]}
    >
      <View style={styles.folderCardRow}>
        <View
          style={[
            styles.iconWrap,
            {
              transform: [
                { translateX: ITEM.icon.offsetX },
                { translateY: ITEM.icon.offsetY },
              ],
            },
          ]}
        >
          <Text style={[styles.folderIcon, { fontSize: ITEM.icon.fontSize }]}>📁</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text
            style={[
              styles.folderName,
              {
                fontSize: ITEM.title.fontSize,
                ...(ITEM.title.lineHeight > 0 ? { lineHeight: ITEM.title.lineHeight } : {}),
                transform: [
                  { translateX: ITEM.title.offsetX },
                  { translateY: ITEM.title.offsetY },
                ],
                color: selected ? '#FFFFFF' : evoconnColors.text,
              },
            ]}
          >
            {folder.name}
          </Text>
        </View>
        <View
          style={[
            styles.checkWrap,
            {
              transform: [
                { translateX: ITEM.check.offsetX },
                { translateY: ITEM.check.offsetY },
              ],
            },
          ]}
        >
          {selected ? (
            <Text style={[styles.check, { fontSize: ITEM.check.fontSize }]}>✓</Text>
          ) : (
            <View style={styles.checkPlaceholder} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const PhraseFolderManagerCard = React.memo(function PhraseFolderManagerCard({
  borderColor,
  borderWidth,
  backgroundColor,
  innerBorderColor,
  folders,
  selectedFolderId,
  onSelectFolder,
}: Props) {
  const innerMarginLeft = IC.offsetX + L.contentOffsetX + L.content.offsetX;
  const innerMarginTop = IC.offsetY + L.contentOffsetY + L.content.offsetY;

  return (
    <View
      style={[
        styles.outerCard,
        {
          borderColor,
          borderWidth,
          backgroundColor,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={starBoxStyle}>
          <WhiteStar width={STAR_SZ} height={STAR_SZ} />
        </View>
        <View
          style={[
            styles.titleBox,
            { left: STAR_SZ + L.star.marginRight + L.title.offsetX },
          ]}
        >
          <Text
            style={[
              styles.blockTitleText,
              {
                fontSize: L.title.fontSize,
                ...(L.title.lineHeight > 0 ? { lineHeight: L.title.lineHeight } : {}),
                marginTop: L.title.offsetY,
              },
            ]}
          >
            Añadir a carpeta...
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.innerCard,
          {
            marginLeft: innerMarginLeft,
            marginTop: innerMarginTop,
            height: L.height,
            overflow: 'hidden',
            backgroundColor: 'transparent',
          },
          IC.widthScale * L.content.widthScale < 1
            ? {
                alignSelf: 'center' as const,
                width: `${IC.widthScale * L.content.widthScale * 100}%` as unknown as number,
              }
            : undefined,
        ]}
      >
        {folders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>
              Crea carpetas desde el menú lateral (Pensamientos → Carpetas).
            </Text>
          </View>
        ) : (
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.scrollFill}
            contentContainerStyle={[styles.scrollContent, { gap: ITEM.gap }]}
          >
            {folders.map((f) => (
              <FolderItemBox
                key={f.id}
                folder={f}
                selected={f.id === selectedFolderId}
                folderBorderColor={innerBorderColor}
                onPress={() => onSelectFolder(f)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerCard: {
    borderRadius: CARD.borderRadius,
  },
  header: {
    height: HEADER_H,
    marginBottom: SB.headerMarginBottom,
  },
  titleBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
  },
  blockTitleText: {
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'none',
    color: HDR.titleColor,
  },
  innerCard: {},
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollFill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  emptyHint: {
    color: evoconnColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  folderCard: {},
  folderCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  iconWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIcon: {},
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  folderName: {
    fontWeight: '600',
  },
  checkWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#C7FF02',
    fontWeight: '800',
  },
  checkPlaceholder: {
    width: 16,
    height: 16,
  },
});
