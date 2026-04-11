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
import { getConversationsFrameByHouse } from '@evoconn/utils/getSidebarConversationsFrameByHouse';
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
const SECTION_ICON_THOUGHTS = require('../assets/sidebar/conversationsSections/section_thoughts_triangle.png');

type TabId = 'favorites' | 'folders' | 'thoughts';

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
  const [activeTab, setActiveTab] = useState<TabId>('thoughts');
  const [foldersBrowseId, setFoldersBrowseId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<ConversationItem | null>(null);
  const [renameText, setRenameText] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderConvId, setNewFolderConvId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderText, setRenameFolderText] = useState('');

  const frameSource = useMemo(() => getConversationsFrameByHouse(clanId), [clanId]);
  const folderColors = useMemo(() => getSidebarFolderColors(clanId), [clanId]);
  const clanTabColors = useMemo(() => getSidebarClanTabColorRow(clanId), [clanId]);
  const browsedFolderName = useMemo(
    () => (foldersBrowseId ? folders.find((f) => f.id === foldersBrowseId)?.name ?? '' : ''),
    [foldersBrowseId, folders],
  );

  const imgW = L.SIDEBAR_CONVERSATIONS_IMAGE_WIDTH;
  const imgH = L.SIDEBAR_CONVERSATIONS_IMAGE_HEIGHT;
  const cropL = L.SIDEBAR_CONVERSATIONS_CROP_LEFT;
  const cropR = L.SIDEBAR_CONVERSATIONS_CROP_RIGHT;
  const cropT = L.SIDEBAR_CONVERSATIONS_CROP_TOP;
  const cropB = L.SIDEBAR_CONVERSATIONS_CROP_BOTTOM;
  const visibleW = Math.max(1, imgW - cropL - cropR);
  const visibleH = Math.max(1, imgH - cropT - cropB);
  const stretchH = L.SIDEBAR_CONVERSATIONS_HORIZONTAL_STRETCH;
  const layoutW = Math.max(1, visibleW * stretchH);

  const q = drawerSearch.trim().toLowerCase();

  const listConversations = useMemo(() => {
    if (q) {
      return conversations.filter((c) => c.title.toLowerCase().includes(q));
    }
    if (activeTab === 'favorites') {
      return conversations.filter((c) => c.isFavorite);
    }
    if (activeTab === 'folders') {
      if (foldersBrowseId) {
        return conversations.filter((c) => c.folderId === foldersBrowseId);
      }
      return [];
    }
    return conversations;
  }, [conversations, activeTab, q, foldersBrowseId]);

  const onTab = useCallback((t: TabId) => {
    setActiveTab(t);
    setFoldersBrowseId(null);
  }, []);

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
    L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_HEIGHT,
    L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE + L.SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y
  );

  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        transform: [
          { translateX: L.SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_X },
          { translateY: L.SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_Y },
          { scale: L.SIDEBAR_CONVERSATIONS_BLOCK_SCALE },
        ],
      }}
    >
      <View
        style={{
          transform: [
            { translateX: L.SIDEBAR_CONVERSATIONS_OFFSET_X },
            { translateY: L.SIDEBAR_CONVERSATIONS_OFFSET_Y },
          ],
        }}
      >
        <View style={{ position: 'relative', width: layoutW, height: visibleH, alignSelf: 'center' }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: layoutW,
              height: visibleH,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: visibleW,
                height: visibleH,
                transform: [{ scaleX: stretchH }],
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: visibleW,
                  height: visibleH,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: -cropL,
                    top: -cropT,
                    width: imgW,
                    height: imgH,
                  }}
                >
                  <Image
                    source={frameSource}
                    style={{ width: imgW, height: imgH }}
                    resizeMode="stretch"
                  />
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              position: 'absolute',
              left: L.SIDEBAR_CONVERSATIONS_VIEWPORT_OFFSET_X,
              top: L.SIDEBAR_CONVERSATIONS_VIEWPORT_OFFSET_Y,
              width: L.SIDEBAR_CONVERSATIONS_VIEWPORT_WIDTH,
              height: L.SIDEBAR_CONVERSATIONS_VIEWPORT_HEIGHT,
              flexDirection: 'column',
            }}
          >
            {!q ? (
              <View style={{ paddingBottom: L.SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y, zIndex: 1 }}>
                {/* ── FAVORITOS ── */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  hitSlop={6}
                  onPress={() => onTab('favorites')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: L.SIDEBAR_FAVORITES_OFFSET_X,
                    marginTop: L.SIDEBAR_FAVORITES_OFFSET_Y,
                    marginBottom: L.SIDEBAR_CONVERSATIONS_SECTION_GAP_Y,
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
                          activeTab === 'favorites'
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
                        color: activeTab === 'favorites' ? clanTabColors.favorites.label : '#FFFFFF',
                      },
                    ]}
                  >
                    FAVORITOS
                  </Text>
                </TouchableOpacity>

                {/* ── CARPETAS ── */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  hitSlop={6}
                  onPress={() => onTab('folders')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: L.SIDEBAR_FOLDERS_OFFSET_X,
                    marginTop: L.SIDEBAR_FOLDERS_OFFSET_Y,
                    marginBottom: L.SIDEBAR_CONVERSATIONS_SECTION_GAP_Y,
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
                          activeTab === 'folders'
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
                        color: activeTab === 'folders' ? clanTabColors.folders.label : '#FFFFFF',
                      },
                    ]}
                  >
                    CARPETAS
                  </Text>
                </TouchableOpacity>

                {/* ── PENSAMIENTOS ── */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onTab('thoughts')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: L.SIDEBAR_THOUGHTS_OFFSET_X,
                    marginTop: L.SIDEBAR_THOUGHTS_OFFSET_Y,
                    paddingVertical: 6,
                    transform: [{ scale: L.SIDEBAR_THOUGHTS_SCALE }],
                  }}
                >
                  <View
                    style={{
                      marginLeft: L.THOUGHTS_ICON_OFFSET_X,
                      marginTop: L.THOUGHTS_ICON_OFFSET_Y,
                      transform: [{ scale: L.THOUGHTS_ICON_SCALE }],
                    }}
                  >
                    <Image
                      source={SECTION_ICON_THOUGHTS}
                      style={{
                        width: L.THOUGHTS_ICON_BASE_SIZE,
                        height: L.THOUGHTS_ICON_BASE_SIZE,
                        tintColor:
                          activeTab === 'thoughts'
                            ? sidebarTabIconTint(clanTabColors.thoughts.icon)
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
                        marginLeft: L.THOUGHTS_ICON_TEXT_GAP_X,
                        fontSize: L.SIDEBAR_THOUGHTS_FONT_SIZE,
                        letterSpacing: L.SIDEBAR_THOUGHTS_LETTER_SPACING,
                        color: activeTab === 'thoughts' ? clanTabColors.thoughts.label : '#FFFFFF',
                      },
                    ]}
                  >
                    PENSAMIENTOS
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  paddingLeft: 4,
                  paddingTop: 4,
                  marginBottom: L.SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y,
                }}
              >
                <Text style={styles.searchHint}>Resultados</Text>
              </View>
            )}

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{
                paddingTop: 0,
                paddingBottom: 8,
                paddingLeft: L.SIDEBAR_CONVERSATIONS_ITEM_OFFSET_X,
                paddingRight: 4,
                alignItems: 'stretch',
              }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {activeTab === 'folders' && !q && !foldersBrowseId ? (
                <View
                  style={{
                    alignSelf: 'stretch',
                    width: '100%',
                    paddingLeft: FIL.listPaddingLeft,
                    transform: [
                      { translateX: FIL.listOffsetX },
                      { translateY: FIL.listOffsetY },
                    ],
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

              {activeTab === 'folders' && !q && foldersBrowseId ? (
                <SidebarFolderViewHeader
                  folderName={browsedFolderName}
                  primaryColor={folderColors.primary}
                  onBack={() => setFoldersBrowseId(null)}
                />
              ) : null}

              {(q || activeTab !== 'folders' || foldersBrowseId) &&
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
                        numberOfLines={2}
                        style={[
                          styles.rowTitle,
                          {
                            fontSize: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE,
                            color: L.SIDEBAR_CONVERSATIONS_ITEM_TITLE_COLOR,
                            minHeight: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_HEIGHT,
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
              (q || activeTab === 'favorites' || (activeTab === 'folders' && foldersBrowseId)) ? (
                <Text style={styles.empty}>Nada que mostrar</Text>
              ) : null}
            </ScrollView>
          </View>
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
  sectionLabel: { textTransform: 'uppercase' },
  searchHint: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  scroll: { flex: 1, minHeight: 0, marginTop: 0 },
  rowTitle: { fontWeight: '600', color: '#F3F4F6' },
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
