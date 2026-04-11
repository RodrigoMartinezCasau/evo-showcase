import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';
import { getStarByHouse, SIDEBAR_DEFAULT_STAR } from '@evoconn/utils/getSidebarStar';
import { getCommunityButtonByHouse } from '@evoconn/utils/getSidebarCommunityButton';
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
import EstrellaComunidadSvg from '../assets/sidebar/estrellaComunidadSvg/estrellaComunidad.svg';
import { SidebarSearchBar } from './SidebarSearchBar';
import { SidebarConversationsPanel } from './SidebarConversationsPanel';
import { SidebarClanButton } from './SidebarClanButton';
import { SidebarClanInsignia } from './SidebarClanInsignia';
import { SidebarFooterProfileText } from './SidebarFooterProfileText';
import { SidebarSettingsIcon } from './SidebarSettingsIcon';
import { FrasesButton } from './FrasesButton';
import { RachaButton } from './RachaButton';
import type { ConversationItem as ConvItem } from '@evoconn/types';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useConversationFolders } from '@evoconn/hooks/ConversationFoldersContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { SIDEBAR_DRAWER_OFFSCREEN_TRANSLATE_X } from '@evoconn/constants/communityDrawerGesture';

type SidebarDrawerProps = {
  visible: boolean;
  onClose: () => void;
  conversations: ConvItem[];
  onConversationPress: (id: string) => void;
  searchQuery?: string;
  /**
   * External animated progress (0 = closed, 1 = open).
   * When provided, the parent controls all animation; the drawer just follows.
   * When omitted, the drawer self-animates based on `visible`.
   */
  openProgress?: Animated.Value;
};

export function SidebarDrawer({
  visible,
  onClose,
  conversations,
  onConversationPress,
  searchQuery: _searchQuery = '',
  openProgress: openProgressProp,
}: SidebarDrawerProps) {
  const router = useRouter();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const user = { ...mockCurrentUser, clanId: activeClan };
  const closeSidebar = onClose;
  const searchInputRef = useRef<TextInput>(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [convState, setConvState] = useState(conversations);
  const { folders: folderState, setFolders: setFolderState } = useConversationFolders();

  useEffect(() => {
    setConvState(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!visible) {
      searchInputRef.current?.blur();
      Keyboard.dismiss();
    }
  }, [visible]);

  const internalAnim = useRef(new Animated.Value(0)).current;
  const drive = openProgressProp ?? internalAnim;

  const [interactable, setInteractable] = useState(false);

  useEffect(() => {
    const id = drive.addListener(({ value }) => {
      setInteractable(value > 0.01);
    });
    return () => drive.removeListener(id);
  }, [drive]);

  useEffect(() => {
    if (openProgressProp) return;
    if (visible) {
      Animated.timing(internalAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(internalAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, openProgressProp]);

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
  const drawerTranslateX = drive.interpolate({
    inputRange: [0, 1],
    outputRange: [SIDEBAR_DRAWER_OFFSCREEN_TRANSLATE_X, 0],
  });

  return (
    <View style={styles.overlayRoot} pointerEvents={interactable ? 'box-none' : 'none'}>
      <Animated.View style={[styles.overlayBg, { opacity: drive }]} />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerTranslateX }] }]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={() => Keyboard.dismiss()}
      >
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
            element: (
              <EstrellaComunidadSvg
                width={SCL.SIDEBAR_COMMUNITY_STAR_WIDTH}
                height={SCL.SIDEBAR_COMMUNITY_STAR_HEIGHT}
              />
            ),
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
          onPress={() => {
            onClose();
            router.replace({ pathname: '/phrase' });
          }}
        />
        <View style={styles.searchBarLayer}>
          <SidebarSearchBar ref={searchInputRef} value={drawerSearch} onChangeText={setDrawerSearch} />
        </View>
        <View style={styles.sidebarLowerBlock} onStartShouldSetResponder={() => true}>
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
        <SidebarClanInsignia
          clanId={user.clanId}
          onPress={() => {
            onClose();
            router.push('/profile');
          }}
        />
        <SidebarFooterProfileText
          username={user.username}
          clanId={user.clanId}
          rank={user.rank}
          onPressProfile={() => {
            onClose();
            router.push('/profile');
          }}
          onPressClan={() => {
            onClose();
            router.push(`/clan/${clanRouteSlug}`);
          }}
        />
        <SidebarSettingsIcon
          onPress={() => {
            onClose();
            router.push('/settings');
          }}
        />
        <View style={styles.footer} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 200,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  searchBarLayer: { zIndex: 25, marginTop: 8, paddingHorizontal: 10 },
  sidebarLowerBlock: { flex: 1, minHeight: 0, paddingHorizontal: 10 },
  footer: {},
});
