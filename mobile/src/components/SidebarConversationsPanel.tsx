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
import type { ConversationItem, SidebarFolder } from '@evoconn/types';

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

  const frameSource = useMemo(() => getConversationsFrameByHouse(clanId), [clanId]);

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
    [conversations, folders, onConversationsChange, deleteConv]
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

  const sectionHeaderText = { color: '#FFFFFF' as const, fontWeight: '700' as const };

  const rowH = Math.max(
    L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_HEIGHT,
    L.SIDEBAR_CONVERSATIONS_STAR_SIZE + L.SIDEBAR_CONVERSATIONS_STAR_OFFSET_Y
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
              <View style={{ marginBottom: L.SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: L.SIDEBAR_FAVORITES_OFFSET_X,
                    marginTop: L.SIDEBAR_FAVORITES_OFFSET_Y,
                    marginBottom: L.SIDEBAR_CONVERSATIONS_SECTION_GAP_Y,
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
                      }}
                      resizeMode="contain"
                    />
                  </View>
                  <TouchableOpacity
                    style={{
                      marginLeft: L.FAVORITES_ICON_TEXT_GAP_X,
                      transform: [{ scale: L.SIDEBAR_FAVORITES_SCALE }],
                    }}
                    onPress={() => onTab('favorites')}
                    hitSlop={6}
                  >
                    <Text
                      style={[
                        styles.sectionLabel,
                        sectionHeaderText,
                        {
                          fontSize: L.SIDEBAR_FAVORITES_FONT_SIZE,
                          letterSpacing: L.SIDEBAR_FAVORITES_LETTER_SPACING,
                        },
                      ]}
                    >
                      FAVORITOS
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: L.SIDEBAR_FOLDERS_OFFSET_X,
                    marginTop: L.SIDEBAR_FOLDERS_OFFSET_Y,
                    marginBottom: L.SIDEBAR_CONVERSATIONS_SECTION_GAP_Y,
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
                      }}
                      resizeMode="contain"
                    />
                  </View>
                  <TouchableOpacity
                    style={{
                      marginLeft: L.FOLDERS_ICON_TEXT_GAP_X,
                      transform: [{ scale: L.SIDEBAR_FOLDERS_SCALE }],
                    }}
                    onPress={() => onTab('folders')}
                    hitSlop={6}
                  >
                    <Text
                      style={[
                        styles.sectionLabel,
                        sectionHeaderText,
                        {
                          fontSize: L.SIDEBAR_FOLDERS_FONT_SIZE,
                          letterSpacing: L.SIDEBAR_FOLDERS_LETTER_SPACING,
                        },
                      ]}
                    >
                      CARPETAS
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: L.SIDEBAR_THOUGHTS_OFFSET_X,
                    marginTop: L.SIDEBAR_THOUGHTS_OFFSET_Y,
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
                      }}
                      resizeMode="contain"
                    />
                  </View>
                  <TouchableOpacity
                    style={{
                      marginLeft: L.THOUGHTS_ICON_TEXT_GAP_X,
                      transform: [{ scale: L.SIDEBAR_THOUGHTS_SCALE }],
                    }}
                    onPress={() => onTab('thoughts')}
                    hitSlop={6}
                  >
                    <Text
                      style={[
                        styles.sectionLabel,
                        sectionHeaderText,
                        {
                          fontSize: L.SIDEBAR_THOUGHTS_FONT_SIZE,
                          letterSpacing: L.SIDEBAR_THOUGHTS_LETTER_SPACING,
                        },
                      ]}
                    >
                      PENSAMIENTOS
                    </Text>
                  </TouchableOpacity>
                </View>
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
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === 'folders' && !q && !foldersBrowseId
                ? folders.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.folderRow,
                        {
                          marginBottom: L.SIDEBAR_CONVERSATIONS_ITEM_GAP_Y,
                          minHeight: rowH,
                        },
                      ]}
                      onPress={() => setFoldersBrowseId(f.id)}
                    >
                      <Text style={styles.folderIcon}>📁</Text>
                      <Text style={[styles.rowTitle, { fontSize: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE }]}>
                        {f.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                : null}

              {activeTab === 'folders' && !q && foldersBrowseId ? (
                <TouchableOpacity
                  style={{ marginBottom: 8 }}
                  onPress={() => setFoldersBrowseId(null)}
                  hitSlop={8}
                >
                  <Text style={styles.backLink}>← Carpetas</Text>
                </TouchableOpacity>
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
                            Math.min(
                              L.SIDEBAR_CONVERSATIONS_STAR_OFFSET_Y,
                              L.SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y
                            ),
                          gap: L.SIDEBAR_CONVERSATIONS_ICONS_INNER_GAP_X,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.iconHit,
                          {
                            width: L.SIDEBAR_CONVERSATIONS_STAR_SIZE,
                            height: L.SIDEBAR_CONVERSATIONS_STAR_SIZE,
                          },
                        ]}
                        onPress={() => toggleFavorite(item.id)}
                        hitSlop={6}
                      >
                        <Text
                          style={[
                            styles.iconText,
                            { fontSize: L.SIDEBAR_CONVERSATIONS_STAR_SIZE * 0.68 },
                          ]}
                        >
                          {item.isFavorite ? '★' : '☆'}
                        </Text>
                      </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { textTransform: 'uppercase' },
  searchHint: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  scroll: { flex: 1, minHeight: 0, marginTop: 0 },
  /** Color base para carpetas; los títulos de conversación lo sobrescriben con el layout. */
  rowTitle: { fontWeight: '600', color: '#F3F4F6' },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  folderIcon: { fontSize: 16 },
  backLink: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
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
