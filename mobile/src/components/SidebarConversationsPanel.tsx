import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SIDEBAR_CONVERSATIONS_LAYOUT as L } from '@evoconn/constants/sidebarConversationsLayout';
import { getClanColor } from '@evoconn/constants/clanColors';
import { getSidebarFolderColors } from '@evoconn/constants/sidebarFolderColors';
import {
  getSidebarClanTabColorRow,
  sidebarTabIconTint,
} from '@evoconn/constants/sidebarClanTabColors';
import type { ConversationItem, SidebarFolder } from '@evoconn/types';
import { SidebarFolderItem } from './SidebarFolderItem';
import { SidebarFolderViewHeader } from './SidebarFolderViewHeader';
import { SIDEBAR_FOLDER_ITEM_LAYOUT as FIL } from '@evoconn/constants/sidebarFolderItemLayout';

const SECTION_ICON_FAVORITES = require('../assets/sidebar/conversationsSections/section_favorites_star.png');
const SECTION_ICON_FOLDERS = require('../assets/sidebar/conversationsSections/section_folders_folder.png');

/** null = todas las conversaciones; los filtros se apagan al pulsar de nuevo el mismo botón */
type ActiveFilter = null | 'favorites' | 'folders';

type SidebarConversationsPanelProps = {
  clanId: string | null;
  conversations: ConversationItem[];
  onConversationsChange: (next: ConversationItem[]) => void;
  folders: SidebarFolder[];
  onFoldersChange: (next: SidebarFolder[]) => void;
  drawerSearch: string;
  onConversationPress: (id: string) => void;
};

export function SidebarConversationsPanel({
  clanId,
  conversations,
  onConversationsChange,
  folders,
  onFoldersChange,
  drawerSearch,
  onConversationPress,
}: SidebarConversationsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [foldersBrowseId, setFoldersBrowseId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<ConversationItem | null>(null);
  const [renameText, setRenameText] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderConvId, setNewFolderConvId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderText, setRenameFolderText] = useState('');

  const frameBorderColor = useMemo(() => getClanColor(clanId), [clanId]);
  const folderColors = useMemo(() => getSidebarFolderColors(clanId), [clanId]);
  const clanTabColors = useMemo(() => getSidebarClanTabColorRow(clanId), [clanId]);
  const browsedFolderName = useMemo(
    () => (foldersBrowseId ? folders.find((f) => f.id === foldersBrowseId)?.name ?? '' : ''),
    [foldersBrowseId, folders],
  );

  const q = drawerSearch.trim().toLowerCase();

  const listConversations = useMemo(() => {
    if (q) {
      return conversations.filter((c) => c.title.toLowerCase().includes(q));
    }
    if (activeFilter === 'favorites') {
      return conversations.filter((c) => c.isFavorite);
    }
    if (activeFilter === 'folders') {
      if (foldersBrowseId) {
        return conversations.filter((c) => c.folderId === foldersBrowseId);
      }
      return [];
    }
    return conversations;
  }, [conversations, activeFilter, q, foldersBrowseId]);

  const toggleFavorites = useCallback(() => {
    setActiveFilter((prev) => (prev === 'favorites' ? null : 'favorites'));
    setFoldersBrowseId(null);
  }, []);

  const toggleFolders = useCallback(() => {
    setActiveFilter((prev) => (prev === 'folders' ? null : 'folders'));
    setFoldersBrowseId(null);
  }, []);

  const handleFolderBack = useCallback(() => setFoldersBrowseId(null), []);

  const toggleFavorite = useCallback(
    (id: string) => {
      onConversationsChange(
        conversations.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
      );
    },
    [conversations, onConversationsChange]
  );

  const deleteConv = useCallback(
    (id: string) => {
      onConversationsChange(conversations.filter((c) => c.id !== id));
    },
    [conversations, onConversationsChange]
  );

  const applyRename = useCallback(() => {
    if (!renameTarget) return;
    const t = renameText.trim().slice(0, 80);
    if (!t) return;
    onConversationsChange(
      conversations.map((c) => (c.id === renameTarget.id ? { ...c, title: t } : c))
    );
    setRenameTarget(null);
    setRenameText('');
  }, [renameTarget, renameText, conversations, onConversationsChange]);

  const openEditMenu = useCallback(
    (item: ConversationItem) => {
      Alert.alert(item.title, undefined, [
        {
          text: 'Editar nombre',
          onPress: () => {
            setRenameTarget(item);
            setRenameText(item.title);
          },
        },
        {
          text: item.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito',
          onPress: () => toggleFavorite(item.id),
        },
        {
          text: 'Añadir a carpeta',
          onPress: () => {
            if (folders.length === 0) {
              Alert.alert('No hay carpetas', 'Crea una carpeta primero.');
              return;
            }
            Alert.alert(
              'Elegir carpeta',
              undefined,
              [
                ...folders.map((f) => ({
                  text: f.name,
                  onPress: () => {
                    onConversationsChange(
                      conversations.map((c) => (c.id === item.id ? { ...c, folderId: f.id } : c))
                    );
                  },
                })),
                { text: 'Cancelar', style: 'cancel' as const },
              ],
              { cancelable: true }
            );
          },
        },
        {
          text: 'Nueva carpeta',
          onPress: () => {
            setNewFolderConvId(item.id);
            setNewFolderName('');
            setNewFolderOpen(true);
          },
        },
        {
          text: 'Borrar conversación',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Borrar', `¿Eliminar «${item.title}»?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Borrar', style: 'destructive', onPress: () => deleteConv(item.id) },
            ]);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [conversations, folders, onConversationsChange, deleteConv, toggleFavorite]
  );

  const createFolderAndAssign = useCallback(() => {
    const name = newFolderName.trim();
    if (!name || !newFolderConvId) return;
    const id = `f${Date.now()}`;
    onFoldersChange([...folders, { id, name }]);
    onConversationsChange(
      conversations.map((c) => (c.id === newFolderConvId ? { ...c, folderId: id } : c))
    );
    setNewFolderOpen(false);
    setNewFolderName('');
    setNewFolderConvId(null);
  }, [newFolderName, newFolderConvId, folders, conversations, onFoldersChange, onConversationsChange]);

  const openFolderEditMenu = useCallback(
    (folder: { id: string; name: string }) => {
      Alert.alert(folder.name, undefined, [
        {
          text: 'Renombrar carpeta',
          onPress: () => {
            setRenameFolderId(folder.id);
            setRenameFolderText(folder.name);
          },
        },
        {
          text: 'Eliminar carpeta',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Eliminar', `¿Eliminar «${folder.name}»?`, [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                  onFoldersChange(folders.filter((f) => f.id !== folder.id));
                  onConversationsChange(
                    conversations.map((c) =>
                      c.folderId === folder.id ? { ...c, folderId: null } : c
                    )
                  );
                  if (foldersBrowseId === folder.id) setFoldersBrowseId(null);
                },
              },
            ]);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [folders, conversations, foldersBrowseId, onFoldersChange, onConversationsChange]
  );

  const applyFolderRename = useCallback(() => {
    if (!renameFolderId) return;
    const t = renameFolderText.trim().slice(0, 60);
    if (!t) return;
    onFoldersChange(
      folders.map((f) => (f.id === renameFolderId ? { ...f, name: t } : f))
    );
    setRenameFolderId(null);
    setRenameFolderText('');
  }, [renameFolderId, renameFolderText, folders, onFoldersChange]);

  const sectionHeaderText = { color: '#FFFFFF' as const, fontWeight: '700' as const };

  const rowH = Math.max(
    L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_MIN_HEIGHT,
    L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE + L.SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y
  );

  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        marginLeft: L.SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_X + L.SIDEBAR_CONVERSATIONS_OFFSET_X,
        marginTop: L.SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_Y + L.SIDEBAR_CONVERSATIONS_OFFSET_Y,
      }}
    >
      {!q ? (
        <View
          pointerEvents="box-none"
          style={{
            flexShrink: 0,
            alignSelf: 'stretch',
            marginBottom: L.SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: L.SIDEBAR_FAVORITES_FOLDERS_ROW_GAP_X,
            backgroundColor: 'transparent',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={toggleFavorites}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === 'favorites' }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 1,
              marginLeft: L.SIDEBAR_FAVORITES_OFFSET_X,
              marginTop: L.SIDEBAR_FAVORITES_OFFSET_Y,
              transform: [{ scale: L.SIDEBAR_FAVORITES_SCALE }],
            }}
          >
            <View
              style={{
                marginLeft: L.FAVORITES_ICON_OFFSET_X,
                marginTop: L.FAVORITES_ICON_OFFSET_Y,
                transform: [{ scale: L.FAVORITES_ICON_SCALE }],
              }}
            >
              <Image
                source={SECTION_ICON_FAVORITES}
                style={{
                  width: L.FAVORITES_ICON_BASE_SIZE,
                  height: L.FAVORITES_ICON_BASE_SIZE,
                  tintColor:
                    activeFilter === 'favorites'
                      ? sidebarTabIconTint(clanTabColors.favorites.icon)
                      : undefined,
                }}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[
                styles.sectionLabel,
                sectionHeaderText,
                {
                  marginLeft: L.FAVORITES_ICON_TEXT_GAP_X,
                  fontSize: L.SIDEBAR_FAVORITES_FONT_SIZE,
                  letterSpacing: L.SIDEBAR_FAVORITES_LETTER_SPACING,
                  color: activeFilter === 'favorites' ? clanTabColors.favorites.label : '#FFFFFF',
                },
              ]}
              numberOfLines={1}
            >
              FAVORITOS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={toggleFolders}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === 'folders' }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 1,
              marginTop: L.SIDEBAR_FOLDERS_OFFSET_Y,
              transform: [{ scale: L.SIDEBAR_FOLDERS_SCALE }],
            }}
          >
            <View
              style={{
                marginLeft: L.FOLDERS_ICON_OFFSET_X,
                marginTop: L.FOLDERS_ICON_OFFSET_Y,
                transform: [{ scale: L.FOLDERS_ICON_SCALE }],
              }}
            >
              <Image
                source={SECTION_ICON_FOLDERS}
                style={{
                  width: L.FOLDERS_ICON_BASE_SIZE,
                  height: L.FOLDERS_ICON_BASE_SIZE,
                  tintColor:
                    activeFilter === 'folders'
                      ? sidebarTabIconTint(clanTabColors.folders.icon)
                      : undefined,
                }}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[
                styles.sectionLabel,
                sectionHeaderText,
                {
                  marginLeft: L.FOLDERS_ICON_TEXT_GAP_X,
                  fontSize: L.SIDEBAR_FOLDERS_FONT_SIZE,
                  letterSpacing: L.SIDEBAR_FOLDERS_LETTER_SPACING,
                  color: activeFilter === 'folders' ? clanTabColors.folders.label : '#FFFFFF',
                },
              ]}
              numberOfLines={1}
            >
              CARPETAS
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{
            flexShrink: 0,
            alignSelf: 'stretch',
            paddingLeft: 4,
            paddingTop: 2,
            marginBottom: L.SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y,
            backgroundColor: 'transparent',
          }}
        >
          <Text style={styles.searchHint}>Resultados</Text>
        </View>
      )}

      {/*
       * `barFill` flex:1 + minHeight:0; el marco es absoluteFill. Los filtros van
       * fuera, entre la búsqueda del drawer y este bloque.
       */}
      <View style={styles.barFill}>
          <View
            pointerEvents="none"
            style={[
              styles.barFrameLayer,
              {
                borderColor: frameBorderColor,
                borderWidth: L.SIDEBAR_CONVERSATIONS_FRAME_BORDER_WIDTH,
                borderRadius: L.SIDEBAR_CONVERSATIONS_FRAME_CORNER_RADIUS,
                backgroundColor: L.SIDEBAR_CONVERSATIONS_FRAME_FILL_COLOR,
              },
            ]}
          />

          <View
            style={[
              styles.barContentInset,
              {
                paddingLeft: L.SIDEBAR_CONVERSATIONS_INSET_LEFT_PCT,
                paddingRight: L.SIDEBAR_CONVERSATIONS_INSET_RIGHT_PCT,
                paddingTop: L.SIDEBAR_CONVERSATIONS_INSET_TOP_PCT,
                paddingBottom: L.SIDEBAR_CONVERSATIONS_INSET_BOTTOM_PCT,
              },
            ]}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {activeFilter === 'folders' && !q && !foldersBrowseId ? (
                <View
                  style={{
                    alignSelf: 'stretch',
                    width: '100%',
                    paddingLeft: FIL.listPaddingLeft,
                    marginLeft: FIL.listOffsetX,
                    marginTop: FIL.listOffsetY,
                  }}
                >
                  {folders.map((f) => (
                    <View key={f.id} style={{ marginBottom: FIL.rowGap }}>
                      <SidebarFolderItem
                        name={f.name}
                        titleColor={folderColors.primary}
                        onPress={() => setFoldersBrowseId(f.id)}
                        onPencilPress={() => openFolderEditMenu(f)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              {activeFilter === 'folders' && !q && foldersBrowseId ? (
                <SidebarFolderViewHeader
                  folderName={browsedFolderName}
                  primaryColor={folderColors.primary}
                  onBack={handleFolderBack}
                />
              ) : null}

              {(q || activeFilter !== 'folders' || foldersBrowseId) &&
                listConversations.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.convRow,
                      {
                        marginBottom: L.SIDEBAR_CONVERSATIONS_ITEM_GAP_Y,
                        minHeight: rowH,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => onConversationPress(item.id)}
                      style={[
                        styles.convRowTitleWrap,
                        {
                          paddingTop: L.SIDEBAR_CONVERSATIONS_ITEM_OFFSET_Y,
                          marginRight: L.SIDEBAR_CONVERSATIONS_TITLE_ICONS_GAP_X,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          styles.rowTitle,
                          {
                            fontSize: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE,
                            lineHeight: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_LINE_HEIGHT,
                            color: L.SIDEBAR_CONVERSATIONS_ITEM_TITLE_COLOR,
                            minHeight: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_MIN_HEIGHT,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.convRowIcons,
                        {
                          marginRight: L.SIDEBAR_CONVERSATIONS_ICONS_STRIP_MARGIN_END,
                          paddingTop:
                            L.SIDEBAR_CONVERSATIONS_ITEM_OFFSET_Y +
                            L.SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.iconHit,
                          {
                            width: L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE,
                            height: L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE,
                          },
                        ]}
                        onPress={() => openEditMenu(item)}
                        hitSlop={6}
                      >
                        <Text
                          style={[
                            styles.iconText,
                            { fontSize: L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE * 0.68 },
                          ]}
                        >
                          ✎
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

              {listConversations.length === 0 &&
              (q || activeFilter === 'favorites' || (activeFilter === 'folders' && foldersBrowseId)) ? (
                <Text style={styles.empty}>Nada que mostrar</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>

      <Modal visible={renameTarget != null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setRenameTarget(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar nombre</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              style={styles.modalInput}
              autoFocus
              placeholder="Título"
              placeholderTextColor="#6B7280"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setRenameTarget(null)}>
                <Text style={styles.modalBtn}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyRename}>
                <Text style={[styles.modalBtn, styles.modalBtnPrimary]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={newFolderOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setNewFolderOpen(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Nueva carpeta</Text>
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              style={styles.modalInput}
              autoFocus
              placeholder="Nombre"
              placeholderTextColor="#6B7280"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setNewFolderOpen(false);
                  setNewFolderConvId(null);
                }}
              >
                <Text style={styles.modalBtn}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createFolderAndAssign}>
                <Text style={[styles.modalBtn, styles.modalBtnPrimary]}>Crear</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={renameFolderId != null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setRenameFolderId(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Renombrar carpeta</Text>
            <TextInput
              value={renameFolderText}
              onChangeText={setRenameFolderText}
              style={styles.modalInput}
              autoFocus
              placeholder="Nombre"
              placeholderTextColor="#6B7280"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setRenameFolderId(null)}>
                <Text style={styles.modalBtn}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyFolderRename}>
                <Text style={[styles.modalBtn, styles.modalBtnPrimary]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  barFill: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  barFrameLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  barContentInset: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  sectionLabel: { textTransform: 'uppercase' },
  searchHint: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  scroll: {
    flex: 1,
    minHeight: 0,
    marginTop: 0,
    zIndex: 0,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 8,
    paddingLeft: L.SIDEBAR_CONVERSATIONS_ITEM_OFFSET_X,
    paddingRight: 4,
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  rowTitle: { fontWeight: '700', letterSpacing: -0.2 },
  convRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  convRowTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  convRowIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconHit: { justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#D1D5DB' },
  empty: { color: '#6B7280', fontSize: 12, marginTop: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { color: '#FFF', fontWeight: '700', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  modalBtn: { color: '#9CA3AF', fontSize: 16 },
  modalBtnPrimary: { color: '#A78BFA', fontWeight: '700' },
});
