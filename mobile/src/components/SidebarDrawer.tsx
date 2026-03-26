import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';
import { getStarByHouse, SIDEBAR_DEFAULT_STAR } from '@evoconn/utils/getSidebarStar';
import {
  getCommunityButtonByHouse,
  SIDEBAR_COMMUNITY_MENU_STAR,
} from '@evoconn/utils/getSidebarCommunityButton';
import { SIDEBAR_COMMUNITY_LAYOUT as SCL } from '@evoconn/constants/sidebarCommunityLayout';
import { getNewReflectionButtonByHouse } from '@evoconn/utils/getSidebarNewReflectionButton';
import {
  getNewReflectionPlusIconByHouse,
  getNewReflectionPlusLayoutByHouse,
} from '@evoconn/utils/getSidebarNewReflectionPlusIcon';
import { getNewPhraseButtonByHouse } from '@evoconn/utils/getSidebarNewPhraseButton';
import {
  getNewPhrasePlusIconByHouse,
  getNewPhrasePlusLayoutByHouse,
} from '@evoconn/utils/getSidebarNewPhrasePlusIcon';
import {
  SidebarPngMenuButton,
  getCommunityPngMenuConfig,
  getNewReflectionPngMenuConfig,
  getNewPhrasePngMenuConfig,
} from './SidebarPngMenuButton';
import { RankBadge } from './RankBadge';
import { SidebarSearchBar } from './SidebarSearchBar';
import { SidebarConversationsPanel } from './SidebarConversationsPanel';
import { SidebarClanButton } from './SidebarClanButton';
import { FrasesButton } from './FrasesButton';
import { RachaButton } from './RachaButton';
import type { ConversationItem as ConvItem } from '@evoconn/types';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { mockSidebarFolders } from '@evoconn/data/mockSidebarFolders';

type SidebarDrawerProps = {
  visible: boolean;
  onClose: () => void;
  conversations: ConvItem[];
  onConversationPress: (id: string) => void;
  searchQuery?: string;
};

export function SidebarDrawer({
  visible,
  onClose,
  conversations,
  onConversationPress,
  searchQuery: _searchQuery = '',
}: SidebarDrawerProps) {
  const router = useRouter();
  const user = mockCurrentUser;
  const closeSidebar = onClose;
  const [drawerSearch, setDrawerSearch] = useState('');
  const [convState, setConvState] = useState(conversations);
  const [folderState, setFolderState] = useState(() => mockSidebarFolders.map((f) => ({ ...f })));

  useEffect(() => {
    setConvState(conversations);
  }, [conversations]);
  const starSource =
    user.clanId != null && user.clanId !== ''
      ? getStarByHouse(user.clanId)
      : SIDEBAR_DEFAULT_STAR;
  const communityButtonSource = getCommunityButtonByHouse(user.clanId);
  const newReflectionButtonSource = getNewReflectionButtonByHouse(user.clanId);
  const newReflectionPlusSource = getNewReflectionPlusIconByHouse(user.clanId);
  const newReflectionPlusLayout = getNewReflectionPlusLayoutByHouse(user.clanId);
  const newPhraseButtonSource = getNewPhraseButtonByHouse(user.clanId);
  const newPhrasePlusSource = getNewPhrasePlusIconByHouse(user.clanId);
  const newPhrasePlusLayout = getNewPhrasePlusLayoutByHouse(user.clanId);
  const clanRouteSlug =
    user.clanId != null && String(user.clanId).trim() !== ''
      ? String(user.clanId).trim().toLowerCase()
      : 'evocon';
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.drawer} onStartShouldSetResponder={() => true}>
          <View
            style={[
              styles.header,
              {
                paddingTop: SH.SIDEBAR_HEADER_PADDING_TOP,
                paddingLeft: SH.SIDEBAR_HEADER_PADDING_LEFT,
                minHeight: SH.SIDEBAR_HEADER_HEIGHT,
              },
            ]}
          >
            <TouchableOpacity onPress={closeSidebar} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cerrar menú">
              <Image
                source={starSource}
                style={{
                  width: SH.SIDEBAR_STAR_SIZE,
                  height: SH.SIDEBAR_STAR_SIZE,
                  transform: [
                    { translateX: SH.SIDEBAR_STAR_OFFSET_X },
                    { translateY: SH.SIDEBAR_STAR_OFFSET_Y },
                  ],
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View
              style={[
                styles.sidebarHeaderTextRow,
                {
                  transform: [
                    { translateX: SH.SIDEBAR_TEXT_OFFSET_X },
                    { translateY: SH.SIDEBAR_TEXT_OFFSET_Y },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.sidebarHeaderTitle,
                  { fontSize: SH.SIDEBAR_TITLE_FONT_SIZE, marginRight: SH.SIDEBAR_TEXT_GAP },
                ]}
              >
                {SH.SIDEBAR_TITLE_TEXT}
              </Text>
              <Text style={[styles.sidebarHeaderVersion, { fontSize: SH.SIDEBAR_VERSION_FONT_SIZE }]}>
                {SH.SIDEBAR_VERSION_TEXT}
              </Text>
            </View>
          </View>
          <SidebarPngMenuButton
            config={getCommunityPngMenuConfig()}
            source={communityButtonSource}
            label="COMUNIDAD"
            accessibilityLabel="Comunidad"
            menuRowStyle={styles.communityMenuRow}
            leftOverlay={{
              source: SIDEBAR_COMMUNITY_MENU_STAR,
              x: SCL.SIDEBAR_COMMUNITY_STAR_OFFSET_X,
              y: SCL.SIDEBAR_COMMUNITY_STAR_OFFSET_Y,
              width: SCL.SIDEBAR_COMMUNITY_STAR_WIDTH,
              height: SCL.SIDEBAR_COMMUNITY_STAR_HEIGHT,
              scale: SCL.SIDEBAR_COMMUNITY_STAR_SCALE,
            }}
            onPress={() => { onClose(); router.push('/(tabs)'); }}
          />
          <SidebarPngMenuButton
            config={getNewReflectionPngMenuConfig()}
            source={newReflectionButtonSource}
            label="NUEVA REFLEXIÓN"
            accessibilityLabel="Nueva reflexión"
            menuRowStyle={styles.communityMenuRow}
            textAdjustsFontSizeToFit={false}
            leftOverlay={{
              source: newReflectionPlusSource,
              x: newReflectionPlusLayout.x,
              y: newReflectionPlusLayout.y,
              width: newReflectionPlusLayout.width,
              height: newReflectionPlusLayout.height,
            }}
            onPress={() => { onClose(); router.push('/reflection'); }}
          />
          <SidebarPngMenuButton
            config={getNewPhrasePngMenuConfig()}
            source={newPhraseButtonSource}
            label="NUEVA FRASE"
            accessibilityLabel="Nueva frase"
            menuRowStyle={styles.communityMenuRow}
            leftOverlay={{
              source: newPhrasePlusSource,
              x: newPhrasePlusLayout.x,
              y: newPhrasePlusLayout.y,
              width: newPhrasePlusLayout.width,
              height: newPhrasePlusLayout.height,
            }}
            onPress={() => { onClose(); router.push('/phrase'); }}
          />
          <View style={styles.sidebarLowerBlock}>
            <SidebarSearchBar value={drawerSearch} onChangeText={setDrawerSearch} />
            <SidebarConversationsPanel
              clanId={user.clanId}
              conversations={convState}
              onConversationsChange={setConvState}
              folders={folderState}
              onFoldersChange={setFolderState}
              drawerSearch={drawerSearch}
              onConversationPress={(id) => {
                onClose();
                onConversationPress(id);
              }}
            />
          </View>
          <SidebarClanButton
            clanId={user.clanId}
            onPress={() => {
              onClose();
              router.push(`/clan/${clanRouteSlug}`);
            }}
          />
          <FrasesButton
            clanId={user.clanId}
            onPress={() => {
              onClose();
              router.push('/frases');
            }}
          />
          <RachaButton
            clanId={user.clanId}
            onPress={() => {
              onClose();
              router.push('/racha');
            }}
          />
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => { onClose(); router.push('/profile'); }} style={styles.footerRow}>
              <View style={[styles.clanDot, { backgroundColor: evoconnColors.accent }]} />
              <View>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.clanName}>{user.clanId ? user.clanId : 'Sin clan'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.rankRow}>
              <RankBadge rank={user.rank} small />
            </View>
            <TouchableOpacity onPress={() => { onClose(); router.push('/settings'); }}>
              <Text style={styles.settings}>⚙ Ajustes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  drawer: {
    position: 'relative',
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#000000',
    flex: 1,
    paddingTop: 48,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sidebarHeaderTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  sidebarHeaderTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sidebarHeaderVersion: {
    color: '#9CA3AF',
  },
  communityMenuRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  menuRow: { paddingVertical: 12, paddingHorizontal: 16 },
  menuText: { color: evoconnColors.text, fontSize: 16 },
  sidebarLowerBlock: { flex: 1, minHeight: 0, marginTop: 8, paddingHorizontal: 10 },
  clanDot: { width: 32, height: 32, borderRadius: 16 },
  footer: { padding: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  username: { color: evoconnColors.text, fontWeight: '600', marginLeft: 8 },
  clanName: { color: evoconnColors.muted, fontSize: 12, marginLeft: 8 },
  rankRow: { marginBottom: 8 },
  settings: { color: evoconnColors.muted, fontSize: 14 },
});
