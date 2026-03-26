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

  const sectionStyle = (tab: TabId) => ({
    color: !q && activeTab === tab ? '#FFFFFF' : '#9CA3AF',
    fontWeight: (!q && activeTab === tab ? '700' : '500') as '700' | '500',
  });

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
              <View
                style={{
                  paddingLeft: L.SIDEBAR_CONVERSATIONS_SECTION_OFFSET_X,
                  paddingTop: L.SIDEBAR_CONVERSATIONS_SECTION_OFFSET_Y,
                }}
              >
                <TouchableOpacity
                  style={{ marginBottom: L.SIDEBAR_CONVERSATIONS_SECTION_GAP_Y }}
                  onPress={() => onTab('favorites')}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.sectionLabel,
                      sectionStyle('favorites'),
                      {
                        fontSize: L.SIDEBAR_CONVERSATIONS_SECTION_FONT_SIZE,
                        letterSpacing: L.SIDEBAR_CONVERSATIONS_SECTION_LETTER_SPACING,
                      },
                    ]}
                  >
                    FAVORITOS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginBottom: L.SIDEBAR_CONVERSATIONS_SECTION_GAP_Y }}
                  onPress={() => onTab('folders')}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.sectionLabel,
                      sectionStyle('folders'),
                      {
                        fontSize: L.SIDEBAR_CONVERSATIONS_SECTION_FONT_SIZE,
                        letterSpacing: L.SIDEBAR_CONVERSATIONS_SECTION_LETTER_SPACING,
                      },
                    ]}
                  >
                    CARPETAS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onTab('thoughts')} hitSlop={6}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      sectionStyle('thoughts'),
                      {
                        fontSize: L.SIDEBAR_CONVERSATIONS_SECTION_FONT_SIZE,
                        letterSpacing: L.SIDEBAR_CONVERSATIONS_SECTION_LETTER_SPACING,
                      },
                    ]}
                  >
                    TUS PENSAMIENTOS
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ paddingLeft: 4, paddingTop: 4 }}>
                <Text style={styles.searchHint}>Resultados</Text>
              </View>
            )}

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{
                paddingTop: 4,
                paddingBottom: 8,
                paddingLeft: L.SIDEBAR_CONVERSATIONS_ITEM_OFFSET_X,
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
                    style={{
                      marginBottom: L.SIDEBAR_CONVERSATIONS_ITEM_GAP_Y,
                      minHeight: rowH,
                      position: 'relative',
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => onConversationPress(item.id)}
                      style={{
                        paddingTop: L.SIDEBAR_CONVERSATIONS_ITEM_OFFSET_Y,
                        maxWidth: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_WIDTH,
                      }}
                    >
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.rowTitle,
                          {
                            fontSize: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE,
                            maxWidth: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_WIDTH,
                            minHeight: L.SIDEBAR_CONVERSATIONS_ITEM_TEXT_HEIGHT,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.type === 'reflection' ? 'Reflexión' : 'Frase'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.iconHit,
                        {
                          position: 'absolute',
                          left: L.SIDEBAR_CONVERSATIONS_STAR_OFFSET_X,
                          top: L.SIDEBAR_CONVERSATIONS_STAR_OFFSET_Y,
                          width: L.SIDEBAR_CONVERSATIONS_STAR_SIZE,
                          height: L.SIDEBAR_CONVERSATIONS_STAR_SIZE,
                        },
                      ]}
                      onPress={() => toggleFavorite(item.id)}
                      hitSlop={6}
                    >
                      <Text style={styles.iconText}>{item.isFavorite ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.iconHit,
                        {
                          position: 'absolute',
                          left: L.SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_X,
                          top: L.SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y,
                          width: L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE,
                          height: L.SIDEBAR_CONVERSATIONS_PENCIL_SIZE,
                        },
                      ]}
                      onPress={() => openEditMenu(item)}
                      hitSlop={6}
                    >
                      <Text style={styles.iconText}>✎</Text>
                    </TouchableOpacity>
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
  scroll: { flex: 1, minHeight: 0, marginTop: 4 },
  rowTitle: { color: '#F3F4F6', fontWeight: '600' },
  rowMeta: { color: '#6B7280', fontSize: 10, marginTop: 2 },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  folderIcon: { fontSize: 16 },
  backLink: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  iconHit: { justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#D1D5DB', fontSize: 16 },
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
