import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { SIDEBAR_HEADER_LAYOUT as SH } from '@evoconn/constants/sidebarHeaderLayout';
import { getSidebarStarSvgByHouse, SIDEBAR_DEFAULT_STAR_SVG } from '@evoconn/utils/getSidebarStarSvgByHouse';
import { getSidebarFooterClanLineColor, getClanColor } from '@evoconn/constants/clanColors';
import { SIDEBAR_COMMUNITY_LAYOUT as SCL } from '@evoconn/constants/sidebarCommunityLayout';
import { SIDEBAR_DEFAULT_COMMUNITY_BUTTON } from '@evoconn/utils/getSidebarCommunityButton';
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
import { SidebarHeaderNotificationsButton } from './SidebarHeaderNotificationsButton';
import { UserAvatarFrame } from './shared/UserAvatarFrame';
import SettingsSvg from '../assets/sidebar/settingsIconSvg/settings.svg';
import { INRIA_SERIF_FONT_FAMILY } from '@evoconn/constants/inriaSerifFontFamily';
import type { Rank } from '@evoconn/types';
import type { ConversationItem as ConvItem } from '@evoconn/types';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useConversationFolders } from '@evoconn/hooks/ConversationFoldersContext';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { SIDEBAR_DRAWER_OFFSCREEN_TRANSLATE_X } from '@evoconn/constants/communityDrawerGesture';
import {
  SIDEBAR_PNG_MENU_ROW_PADDING_HORIZONTAL,
  SIDEBAR_PNG_MENU_BLOCK_OFFSET_X,
  SIDEBAR_PNG_MENU_BUTTON_LAYOUT_WIDTH_PX,
} from '@evoconn/constants/sidebarPngMenuAlignment';
import { SIDEBAR_CONVERSATIONS_AFTER_SEARCH_MARGIN_TOP_PX } from '@evoconn/constants/sidebarSearchBarLayout';
import {
  SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE,
  SIDEBAR_DRAWER_FOOTER_SETTINGS_SIZE,
  SIDEBAR_DRAWER_FOOTER_USERNAME_FONT_SIZE,
  SIDEBAR_DRAWER_FOOTER_CLAN_FONT_SIZE,
  SIDEBAR_DRAWER_FOOTER_RANK_FONT_SIZE,
  SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_USERNAME,
  SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_CLAN,
  SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_RANK,
  SIDEBAR_DRAWER_FOOTER_USERNAME_TOP_OFFSET_RATIO,
  SIDEBAR_DRAWER_FOOTER_USERNAME_TOP_EXTRA_INSET_PX,
  SIDEBAR_DRAWER_FOOTER_RANK_BOTTOM_INSET_PX,
  SIDEBAR_DRAWER_FOOTER_RANK_OPTICAL_NUDGE_Y,
} from '@evoconn/constants/sidebarDrawerFooterLayout';

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

function SidebarDrawerInner({
  visible,
  onClose,
  conversations,
  onConversationPress,
  searchQuery: _searchQuery = '',
  openProgress: openProgressProp,
}: SidebarDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile: authProfile, session } = useAuth();
  const activeClan = useActiveClan(authProfile?.clan_id ?? mockCurrentUser.clanId);
  // El sidebar SIEMPRE se deriva del perfil autenticado cuando hay sesión,
  // así re-renderiza al cargar/cambiar el perfil real. Solo cae al
  // singleton mockCurrentUser cuando NO hay sesión (uso sim/anónimo).
  const user = useMemo(() => {
    if (session && authProfile) {
      const raw = authProfile.username?.trim();
      return {
        id: authProfile.id,
        username: raw ? `@${raw.toUpperCase()}` : '',
        clanId: activeClan,
        rank: authProfile.rank,
        avatarUri: authProfile.avatar_url ?? undefined,
      };
    }
    if (session && !authProfile) {
      return {
        id: session.user?.id ?? '',
        username: '',
        clanId: activeClan,
        rank: 'aprendiz' as Rank,
        avatarUri: undefined,
      };
    }
    return { ...mockCurrentUser, clanId: activeClan };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session,
    authProfile?.id,
    authProfile?.username,
    authProfile?.rank,
    authProfile?.avatar_url,
    activeClan,
    mockCurrentUser.id,
    mockCurrentUser.username,
    mockCurrentUser.rank,
    mockCurrentUser.avatarUri,
  ]);
  const closeSidebar = onClose;
  const searchInputRef = useRef<TextInput>(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const { folders: folderState, setFolders: setFolderState } = useConversationFolders();
  const { updateThought, removeThought } = useThoughts();

  // Persistir favoritos / carpeta / título en thoughtsStorage (antes solo
  // mutaba estado local y el próximo render desde `thoughts` lo pisaba).
  const handleConversationsChange = useCallback(
    (next: ConvItem[]) => {
      const prevById = new Map(conversations.map((c) => [c.id, c]));
      const nextIds = new Set(next.map((c) => c.id));

      for (const c of next) {
        const prev = prevById.get(c.id);
        if (!prev) continue;
        const patch: {
          folderId?: string | null;
          isFavorite?: boolean;
          title?: string;
        } = {};
        if (prev.folderId !== c.folderId) patch.folderId = c.folderId ?? null;
        if (prev.isFavorite !== c.isFavorite) patch.isFavorite = c.isFavorite;
        if (prev.title !== c.title) patch.title = c.title;
        if (Object.keys(patch).length > 0) updateThought(c.id, patch);
      }

      for (const prev of prevById.values()) {
        if (!nextIds.has(prev.id)) removeThought(prev.id);
      }
    },
    [conversations, updateThought, removeThought],
  );

  useEffect(() => {
    if (!visible) {
      searchInputRef.current?.blur();
      Keyboard.dismiss();
    }
  }, [visible]);

  const internalAnim = useRef(new Animated.Value(0)).current;
  const drive = openProgressProp ?? internalAnim;

  // Only used to disable touch handlers while the drawer sits offscreen.
  // We intentionally do NOT lazy-mount the drawer body: doing so dropped
  // the first frame of the open animation (parent's `drawerOpenProgress`
  // had already started animating before our subtree existed, so the
  // drawer "appeared" mid-flight instead of sliding in). Keeping it
  // mounted preserves the smooth slide-in/out feel.
  const [interactable, setInteractable] = useState(visible);

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
  }, [visible, openProgressProp, internalAnim]);

  const insets = useSafeAreaInsets();

  // Footer row: insignia, text, settings

  const footerClanColor = useMemo(() => getSidebarFooterClanLineColor(user.clanId), [user.clanId]);
  const footerClanLine = user.clanId?.trim()
    ? `CLAN ${user.clanId.trim().toUpperCase()}`
    : 'CLAN POR DEFINIR';
  const RANK_LABELS: Record<Rank, string> = { aprendiz: 'APRENDIZ', maestro: 'MAESTRO', filosofo: 'FILOSOFO' };
  const footerRankLine = RANK_LABELS[user.rank as Rank] ?? user.rank.toUpperCase();

  const StarSvg = getSidebarStarSvgByHouse(user.clanId);
  const communityRimColor = getClanColor(user.clanId);
  const newReflectionButtonSource = getNewReflectionButtonByHouse(user.clanId);
  const newReflectionPlusSource = getNewReflectionPlusIconByHouse(user.clanId);
  const newReflectionPlusLayout = getNewReflectionPlusLayoutByHouse(user.clanId);
  const newPhraseButtonSource = getNewPhraseButtonByHouse(user.clanId);
  const newPhrasePlusSource = getNewPhrasePlusIconByHouse(user.clanId);
  const newPhrasePlusLayout = getNewPhrasePlusLayoutByHouse(user.clanId);
  const clanRouteSlug =
    user.clanId != null && String(user.clanId).trim() !== ''
      ? String(user.clanId).trim().toLowerCase()
      : 'indefinido';
  const drawerTranslateX = drive.interpolate({
    inputRange: [0, 1],
    outputRange: [SIDEBAR_DRAWER_OFFSCREEN_TRANSLATE_X, 0],
  });

  return (
    <View style={styles.overlayRoot} pointerEvents={interactable ? 'box-none' : 'none'}>
      <Animated.View style={[styles.overlayBg, { opacity: drive }]} />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: drawerTranslateX }] },
          insets.bottom > 0 && { paddingBottom: insets.bottom },
        ]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={() => Keyboard.dismiss()}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: SH.SIDEBAR_HEADER_PADDING_TOP,
              paddingLeft: SH.SIDEBAR_HEADER_PADDING_LEFT,
              paddingRight: SH.SIDEBAR_HEADER_PADDING_RIGHT,
              minHeight: SH.SIDEBAR_HEADER_HEIGHT,
            },
          ]}
        >
          <View style={styles.headerLeftCluster}>
            <TouchableOpacity onPress={closeSidebar} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cerrar menú">
              <View
                style={{
                  width: SH.SIDEBAR_STAR_SIZE,
                  height: SH.SIDEBAR_STAR_SIZE,
                  transform: [
                    { translateX: SH.SIDEBAR_STAR_OFFSET_X },
                    { translateY: SH.SIDEBAR_STAR_OFFSET_Y },
                    { scale: SH.SIDEBAR_STAR_SCALE },
                  ],
                }}
              >
                <StarSvg width={SH.SIDEBAR_STAR_SIZE} height={SH.SIDEBAR_STAR_SIZE} />
              </View>
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
          <View style={styles.headerTitleSpacer} />
          <SidebarHeaderNotificationsButton onBeforeNavigate={closeSidebar} />
        </View>
        <SidebarPngMenuButton
          config={getCommunityPngMenuConfig()}
          source={SIDEBAR_DEFAULT_COMMUNITY_BUTTON}
          label="COMUNIDAD"
          accessibilityLabel="Comunidad"
          menuRowStyle={styles.communityMenuRow}
          communityRimColor={communityRimColor}
          pauseStars={!interactable}
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
          onPress={() => {
            onClose();
            navigateUnlessCurrent(pathname, '/(tabs)');
          }}
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
          onPress={() => {
            onClose();
            router.push('/reflection');
          }}
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
          {/*
           * Misma columna X que SidebarPngMenuButton: padding 16, −5 px (margin, no transform),
           * ancho fijo del PNG (290). Evita transform + flex:1 (puede colapsar altura en RN).
           */}
          <View style={styles.sidebarConversationsMenuAlign}>
            <View style={styles.sidebarConversationsFixedColumn}>
              <SidebarConversationsPanel
                clanId={user.clanId}
                conversations={conversations}
                onConversationsChange={handleConversationsChange}
                folders={folderState}
                onFoldersChange={setFolderState}
                drawerSearch={drawerSearch}
                onConversationPress={(id) => {
                  onClose();
                  onConversationPress(id);
                }}
              />
            </View>
          </View>
        </View>
        {/* ── Footer row: profile icon | text | settings ── */}
        <View style={styles.footerRow}>
          {/* Profile insignia — left edge aligns with conversations panel */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              navigateUnlessCurrent(pathname, '/my-profile');
            }}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Perfil"
            style={styles.footerInsigniaHit}
          >
            <UserAvatarFrame
              clanId={user.clanId}
              avatarUri={user.avatarUri}
              size={SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE}
            />
          </TouchableOpacity>

          {/*
           * Texto en capas absolutas dentro de 68px = caja del SVG.
           * Nombre: top = ratio × alto insignia (15% por defecto) + EXTRA_INSET_PX.
           * Rango: franja con bottom + flex-end (sin cambios). Ajusta RANK_BOTTOM_INSET_PX si hace falta.
           */}
          <View style={styles.footerTextBlock}>
            <View
              style={[
                styles.footerUserStrip,
                { top: FOOTER_USERNAME_TOP_PX },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  navigateUnlessCurrent(pathname, '/my-profile');
                }}
                hitSlop={6}
                activeOpacity={0.85}
              >
                <Text style={styles.footerUsername} numberOfLines={1}>
                  {user.username.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.footerClanStrip,
                {
                  top: FOOTER_USERNAME_TOP_PX + FOOTER_LH_USER,
                  bottom: FOOTER_CLAN_STRIP_BOTTOM_PX,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  navigateUnlessCurrent(pathname, `/clan/${clanRouteSlug}`);
                }}
                hitSlop={6}
                activeOpacity={0.85}
              >
                <Text style={[styles.footerClanLine, { color: footerClanColor }]} numberOfLines={1}>
                  {footerClanLine}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.footerRankStrip,
                { bottom: SIDEBAR_DRAWER_FOOTER_RANK_BOTTOM_INSET_PX },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  navigateUnlessCurrent(pathname, '/my-profile');
                }}
                hitSlop={6}
                activeOpacity={0.85}
                style={styles.footerRankHit}
              >
                <Text style={styles.footerRankLine} numberOfLines={1}>
                  {footerRankLine}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings — centrado en vertical respecto al bloque 68px del icono */}
          <TouchableOpacity
            style={styles.footerSettingsHit}
            onPress={() => {
              onClose();
              navigateUnlessCurrent(pathname, '/settings');
            }}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            hitSlop={4}
          >
            <SettingsSvg
              width={SIDEBAR_DRAWER_FOOTER_SETTINGS_SIZE}
              height={SIDEBAR_DRAWER_FOOTER_SETTINGS_SIZE}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * Memoised export — same render is reused unless one of the props actually
 * changed. Conversations is a reference from a context, so it can flip
 * identity often; we accept that, but at least context-only updates to other
 * sims/feed state won't force the drawer to re-render its body.
 */
export const SidebarDrawer = React.memo(SidebarDrawerInner);

const FOOTER_LH_USER = Math.round(
  SIDEBAR_DRAWER_FOOTER_USERNAME_FONT_SIZE * SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_USERNAME,
);
const FOOTER_LH_CLAN = Math.round(
  SIDEBAR_DRAWER_FOOTER_CLAN_FONT_SIZE * SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_CLAN,
);
const FOOTER_LH_RANK = Math.round(
  SIDEBAR_DRAWER_FOOTER_RANK_FONT_SIZE * SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_RANK,
);

/** Nombre: debajo del borde superior del bloque = ratio × alto insignia (+ px extra). No toca el rango. */
const FOOTER_USERNAME_TOP_PX =
  Math.round(SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE * SIDEBAR_DRAWER_FOOTER_USERNAME_TOP_OFFSET_RATIO) +
  SIDEBAR_DRAWER_FOOTER_USERNAME_TOP_EXTRA_INSET_PX;

/** Borde inferior de la franja del clan = encima de la franja del rango + inset opcional. */
const FOOTER_CLAN_STRIP_BOTTOM_PX =
  SIDEBAR_DRAWER_FOOTER_RANK_BOTTOM_INSET_PX + FOOTER_LH_RANK;

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
    flexDirection: 'column',
    height: '100%',
    paddingTop: 48,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'visible',
  },
  headerLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitleSpacer: {
    flex: 1,
    minWidth: 0,
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
    paddingHorizontal: SIDEBAR_PNG_MENU_ROW_PADDING_HORIZONTAL,
    alignItems: 'center',
  },
  /** Mismo eje X que los botones PNG (16, no 10). */
  searchBarLayer: {
    zIndex: 25,
    marginTop: 4,
    paddingHorizontal: SIDEBAR_PNG_MENU_ROW_PADDING_HORIZONTAL,
  },
  sidebarLowerBlock: {
    flex: 1,
    minHeight: 0,
    marginTop: SIDEBAR_CONVERSATIONS_AFTER_SEARCH_MARGIN_TOP_PX,
  },
  sidebarConversationsMenuAlign: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: SIDEBAR_PNG_MENU_ROW_PADDING_HORIZONTAL,
    alignItems: 'center',
  },
  sidebarConversationsFixedColumn: {
    flex: 1,
    minHeight: 0,
    width: SIDEBAR_PNG_MENU_BUTTON_LAYOUT_WIDTH_PX,
    alignSelf: 'center',
    marginLeft: SIDEBAR_PNG_MENU_BLOCK_OFFSET_X,
  },

  // Footer row — replaces the three absolute-positioned components.
  // paddingHorizontal: 10 aligns left/right edges with the conversations panel.
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
  },
  /** Misma caja 68×68 que el SVG del escudo (referencia Y común). */
  footerInsigniaHit: {
    width: SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE,
    height: SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE,
  },
  footerTextBlock: {
    flex: 1,
    marginHorizontal: 8,
    height: SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE,
    position: 'relative',
  },
  /** Franja del nombre: altura = lineHeight; top = inset (borde superior del escudo visible). */
  footerUserStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FOOTER_LH_USER,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  /** Hueco entre usuario y rango; el clan centrado en vertical en esa banda. */
  footerClanStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    minHeight: 0,
  },
  /** Franja de altura fija = lineHeight del rango, pegada al borde inferior del bloque. */
  footerRankStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FOOTER_LH_RANK,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  footerRankHit: {
    justifyContent: 'flex-end',
  },
  footerSettingsHit: {
    alignSelf: 'center',
  },
  footerUsername: {
    color: '#B8BCC6',
    fontSize: SIDEBAR_DRAWER_FOOTER_USERNAME_FONT_SIZE,
    lineHeight: FOOTER_LH_USER,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'top' as const }
      : {}),
  },
  footerClanLine: {
    fontSize: SIDEBAR_DRAWER_FOOTER_CLAN_FONT_SIZE,
    lineHeight: FOOTER_LH_CLAN,
    letterSpacing: 0.4,
    fontFamily: INRIA_SERIF_FONT_FAMILY,
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : {}),
  },
  footerRankLine: {
    color: '#FFFFFF',
    fontSize: SIDEBAR_DRAWER_FOOTER_RANK_FONT_SIZE,
    lineHeight: FOOTER_LH_RANK,
    letterSpacing: 0.4,
    fontFamily: INRIA_SERIF_FONT_FAMILY,
    transform: [{ translateY: SIDEBAR_DRAWER_FOOTER_RANK_OPTICAL_NUDGE_Y }],
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : {}),
  },
});
