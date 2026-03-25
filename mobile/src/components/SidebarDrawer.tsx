import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';
import { getStarByHouse, SIDEBAR_DEFAULT_STAR } from '@evoconn/utils/getSidebarStar';
import { getCommunityButtonByHouse } from '@evoconn/utils/getSidebarCommunityButton';
import { getNewReflectionButtonByHouse } from '@evoconn/utils/getSidebarNewReflectionButton';
import {
  SidebarPngMenuButton,
  getCommunityPngMenuConfig,
  getNewReflectionPngMenuConfig,
} from './SidebarPngMenuButton';
import { ConversationListItem } from './ConversationListItem';
import { RankBadge } from './RankBadge';
import type { ConversationItem as ConvItem } from '@evoconn/types';
import { mockCurrentUser } from '@evoconn/data/mockUser';

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
  searchQuery = '',
}: SidebarDrawerProps) {
  const router = useRouter();
  const user = mockCurrentUser;
  const closeSidebar = onClose;
  const starSource =
    user.clanId != null && user.clanId !== ''
      ? getStarByHouse(user.clanId)
      : SIDEBAR_DEFAULT_STAR;
  const communityButtonSource = getCommunityButtonByHouse(user.clanId);
  const newReflectionButtonSource = getNewReflectionButtonByHouse(user.clanId);
  const filtered = searchQuery
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

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
            onPress={() => { onClose(); router.push('/(tabs)'); }}
          />
          <SidebarPngMenuButton
            config={getNewReflectionPngMenuConfig()}
            source={newReflectionButtonSource}
            label="NUEVA REFLEXIÓN"
            accessibilityLabel="Nueva reflexión"
            menuRowStyle={styles.communityMenuRow}
            onPress={() => { onClose(); router.push('/reflection'); }}
          />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => { onClose(); router.push('/phrase'); }}
          >
            <Text style={styles.menuText}>Nueva frase</Text>
          </TouchableOpacity>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TUS PENSAMIENTOS</Text>
            <ScrollView style={styles.convList}>
              {filtered.map((item) => (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  onPress={() => { onClose(); onConversationPress(item.id); }}
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.iconsRow}>
            <TouchableOpacity onPress={() => { onClose(); router.push('/profile'); }}>
              <View style={styles.bigIcon}>
                <View style={[styles.clanDot, { backgroundColor: evoconnColors.accent }]} />
              </View>
              <Text style={styles.iconLabel}>Clan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onClose(); router.push('/phrases-domains'); }}>
              <View style={styles.bigIcon}>
                <Text style={styles.bigIconText}>✎</Text>
              </View>
              <Text style={styles.iconLabel}>Frases</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onClose(); router.push('/streak'); }}>
              <View style={styles.bigIcon}>
                <Text style={styles.bigIconText}>🔥</Text>
              </View>
              <Text style={styles.iconLabel}>Racha</Text>
            </TouchableOpacity>
          </View>
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
    width: '85%',
    maxWidth: 320,
    backgroundColor: evoconnColors.background,
    flex: 1,
    paddingTop: 48,
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
    borderBottomWidth: 1,
    borderBottomColor: evoconnColors.border,
    alignItems: 'center',
  },
  menuRow: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: evoconnColors.border },
  menuText: { color: evoconnColors.text, fontSize: 16 },
  section: { flex: 1, marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { color: evoconnColors.muted, fontSize: 12, marginBottom: 8 },
  convList: { maxHeight: 200 },
  iconsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, borderTopWidth: 1, borderTopColor: evoconnColors.border },
  bigIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: evoconnColors.card, alignItems: 'center', justifyContent: 'center' },
  bigIconText: { fontSize: 24 },
  clanDot: { width: 32, height: 32, borderRadius: 16 },
  iconLabel: { color: evoconnColors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: evoconnColors.border },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  username: { color: evoconnColors.text, fontWeight: '600', marginLeft: 8 },
  clanName: { color: evoconnColors.muted, fontSize: 12, marginLeft: 8 },
  rankRow: { marginBottom: 8 },
  settings: { color: evoconnColors.muted, fontSize: 14 },
});
