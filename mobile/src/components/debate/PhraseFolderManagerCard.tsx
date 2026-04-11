import React, { useMemo, useState, useCallback } from 'react';
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
import IconoCarpetas from '../../assets/folders/iconoCarpetas.svg';
import { getFollowPlusButtonByHouse } from '@evoconn/utils/getFollowPlusButtonByHouse';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useConversationFolders } from '@evoconn/hooks/ConversationFoldersContext';
import { PhraseFolderCreateModal } from './PhraseFolderCreateModal';

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
  const iconDim = ITEM.icon.size * ITEM.icon.scale;
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
              width: iconDim,
              minHeight: iconDim,
              transform: [
                { translateX: ITEM.icon.offsetX },
                { translateY: ITEM.icon.offsetY },
              ],
            },
          ]}
        >
          <IconoCarpetas width={iconDim} height={iconDim} />
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
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { addFolder } = useConversationFolders();
  const [createOpen, setCreateOpen] = useState(false);

  const PlusIcon = useMemo(() => getFollowPlusButtonByHouse(activeClan), [activeClan]);
  const plusSz = L.plusButton.size * L.plusButton.scale;

  const innerMarginLeft = IC.offsetX + L.contentOffsetX + L.content.offsetX;
  const innerMarginTop = IC.offsetY + L.contentOffsetY + L.content.offsetY;

  const onCreateFolder = useCallback(
    (name: string) => {
      addFolder(name);
    },
    [addFolder],
  );

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
            styles.headerTitleRow,
            {
              left: STAR_SZ + L.star.marginRight,
              paddingRight: 4,
            },
          ]}
        >
          <Text
            style={[
              styles.blockTitleText,
              styles.headerTitleFlex,
              {
                fontSize: L.title.fontSize,
                ...(L.title.lineHeight > 0 ? { lineHeight: L.title.lineHeight } : {}),
                marginTop: L.title.offsetY,
                marginLeft: L.title.offsetX,
              },
            ]}
            numberOfLines={1}
          >
            Añadir a carpeta...
          </Text>
          <TouchableOpacity
            onPress={() => setCreateOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Crear carpeta"
            activeOpacity={0.75}
            style={{
              transform: [
                { translateX: L.plusButton.offsetX },
                { translateY: L.plusButton.offsetY },
              ],
            }}
          >
            <PlusIcon width={plusSz} height={plusSz} />
          </TouchableOpacity>
        </View>
      </View>

      <PhraseFolderCreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateFolder}
      />

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
    position: 'relative',
  },
  headerTitleRow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleFlex: {
    flex: 1,
    marginRight: 10,
  },
  blockTitleText: {
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'uppercase',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
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
