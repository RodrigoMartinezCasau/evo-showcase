import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { evoconnColors } from '@evoconn/theme/colors';
import { getSidebarFooterClanLineColor } from '@evoconn/constants/clanColors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  FOLLOWING_SORT_LABELS,
  FOLLOWING_SORT_MENU_ORDER,
  type FollowingSortOption,
} from '@evoconn/constants/followingFeedSort';
import {
  BOTTOM_BAR_DEFAULT_LUPITA,
  getBottomBarLupitaByHouse,
} from '@evoconn/utils/getBottomBarLupitaByHouse';
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
  getNewReflectionPngMenuConfig,
  getNewPhrasePngMenuConfig,
} from './SidebarPngMenuButton';
import { getFollowingSortDropdownBackgroundSvg } from '@evoconn/utils/getFollowingSortDropdownBackground';

/** Recorte vertical del asset 600×600 para mostrar solo la banda del rectángulo. */
const FOLLOWING_SORT_DROPDOWN_VIEWBOX = '0 232 600 92';

const TABS = [
  { id: 'siguiendo', label: 'SIGUIENDO' },
  { id: 'para-ti', label: 'PARA TI' },
  { id: 'search', label: 'SEARCH' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

type BottomCommunityTabsProps = {
  /** Pass null to show no tab as active (e.g. on profile / clan screens). */
  activeTab: TabId | null;
  onTabChange: (tab: TabId) => void;
  /** Orden del feed Siguiendo (comunidad). */
  followingSort?: FollowingSortOption;
  onFollowingSortChange?: (sort: FollowingSortOption) => void;
};

type BarSlot =
  | { kind: 'profile' }
  | { kind: 'tab'; id: TabId; variant?: 'siguiendo' }
  | { kind: 'create' };

const BAR_SLOTS: BarSlot[] = [
  { kind: 'profile' },
  { kind: 'tab', id: 'siguiendo', variant: 'siguiendo' },
  { kind: 'create' },
  { kind: 'tab', id: 'para-ti' },
  { kind: 'tab', id: 'search' },
];

function underlineWidthForTab(tabId: TabId): number | null {
  return tabId === 'search'
    ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_WIDTH_SEARCH
    : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_WIDTH_TEXT;
}

const PROFILE_ICON_UNDERLINE = 28;

function tabMeta(id: TabId) {
  const t = TABS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tab ${id}`);
  return t;
}

export function BottomCommunityTabs({
  activeTab,
  onTabChange,
  followingSort = 'recientes',
  onFollowingSortChange,
}: BottomCommunityTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [createOpen, setCreateOpen] = useState(false);
  const [followingMenuOpen, setFollowingMenuOpen] = useState(false);

  const profileRouteActive = pathname === '/my-profile' || pathname?.endsWith('/my-profile') === true;

  useEffect(() => {
    setFollowingMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (createOpen) setFollowingMenuOpen(false);
  }, [createOpen]);

  const tabFontSize = Math.min(
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_TAB_TEXT_SIZE,
    Math.max(9, Math.floor(screenW / 30)),
  );
  const selectedColor = getSidebarFooterClanLineColor(activeClan);
  const lupEd = BOTTOM_BAR_LAYOUT.BOTTOM_BAR_LUPITA_EDITOR;
  const lupitaPx = Math.round(
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SEARCH_ICON_SIZE *
      BOTTOM_BAR_LAYOUT.SEARCH_ICON_FRAME_SCALE *
      lupEd.scale,
  );

  const LupitaIcon = useMemo(() => {
    if (activeTab === 'search') {
      return getBottomBarLupitaByHouse(activeClan);
    }
    return BOTTOM_BAR_DEFAULT_LUPITA;
  }, [activeTab, activeClan]);

  const newReflectionButtonSource = useMemo(
    () => getNewReflectionButtonByHouse(activeClan),
    [activeClan],
  );
  const newReflectionPlusSource = useMemo(
    () => getNewReflectionPlusIconByHouse(activeClan),
    [activeClan],
  );
  const newReflectionPlusLayout = useMemo(
    () => getNewReflectionPlusLayoutByHouse(activeClan),
    [activeClan],
  );
  const newPhraseButtonSource = useMemo(() => getNewPhraseButtonByHouse(activeClan), [activeClan]);
  const newPhrasePlusSource = useMemo(() => getNewPhrasePlusIconByHouse(activeClan), [activeClan]);
  const newPhrasePlusLayout = useMemo(
    () => getNewPhrasePlusLayoutByHouse(activeClan),
    [activeClan],
  );

  /** Sidebar PNGs use negative blockOffsetY for drawer layout; in modal that clips — neutralize offsets. */
  const reflectionModalConfig = useMemo(
    () => ({ ...getNewReflectionPngMenuConfig(), blockOffsetX: 0, blockOffsetY: 0 }),
    [],
  );
  const phraseModalConfig = useMemo(
    () => ({ ...getNewPhrasePngMenuConfig(), blockOffsetX: 0, blockOffsetY: 0 }),
    [],
  );

  /** Full width minus safe padding; cap for tablets. PNG row ~268 px wide. */
  const createModalWidth = useMemo(() => Math.min(screenW - 24, 420), [screenW]);

  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const onNewReflection = useCallback(() => {
    closeCreate();
    router.push('/reflection');
  }, [closeCreate, router]);

  const onNewPhrase = useCallback(() => {
    closeCreate();
    router.replace({ pathname: '/phrase' });
  }, [closeCreate, router]);

  const createSz = BOTTOM_BAR_LAYOUT.BOTTOM_BAR_CREATE_BUTTON_SIZE;

  const sortMenuBottomOffset =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    16;

  const onSiguiendoPress = useCallback(() => {
    if (activeTab === 'siguiendo') {
      setFollowingMenuOpen((o) => !o);
      return;
    }
    onTabChange('siguiendo');
  }, [activeTab, onTabChange]);

  const onPickFollowingSort = useCallback(
    (sort: FollowingSortOption) => {
      onFollowingSortChange?.(sort);
      setFollowingMenuOpen(false);
    },
    [onFollowingSortChange],
  );

  const profileIconSize = Math.min(30, Math.round(tabFontSize + 20));

  return (
    <>
      <View style={[styles.bar, Platform.OS === 'android' && { paddingBottom: insets.bottom }]}>
        {BAR_SLOTS.map((slot) => {
          if (slot.kind === 'profile') {
            const th = BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_THICKNESS;
            const uw = PROFILE_ICON_UNDERLINE;
            return (
              <TouchableOpacity
                key="profile"
                onPress={() => router.push('/my-profile')}
                style={styles.tab}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Mi perfil"
              >
                <Ionicons
                  name="person"
                  size={profileIconSize}
                  color={profileRouteActive ? selectedColor : evoconnColors.muted}
                />
                {profileRouteActive ? (
                  <View
                    style={[
                      styles.tabUnderline,
                      {
                        width: uw,
                        height: th,
                        backgroundColor: selectedColor,
                        left: '50%',
                        marginLeft: -uw / 2,
                      },
                    ]}
                  />
                ) : null}
              </TouchableOpacity>
            );
          }

          if (slot.kind === 'create') {
            return (
              <View key="create" style={styles.tab}>
                <TouchableOpacity
                  onPress={() => setCreateOpen(true)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Crear publicación"
                  style={[
                    styles.createButton,
                    {
                      width: createSz,
                      height: createSz,
                      borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_CREATE_BUTTON_BORDER_RADIUS,
                      borderWidth: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_CREATE_BUTTON_BORDER_WIDTH,
                      borderColor: selectedColor,
                    },
                  ]}
                >
                  <Text style={[styles.createPlus, { color: selectedColor }]}>+</Text>
                </TouchableOpacity>
              </View>
            );
          }

          const tab = slot.id;
          const { id, label } = tabMeta(tab);
          const isActive = activeTab !== null && activeTab === id;
          const uw = underlineWidthForTab(id);
          const th = BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_THICKNESS;
          const lupUnderlineShiftX =
            id === 'search' ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_LUPITA_UNDERLINE_EDITOR.offsetX : 0;
          const chevronColor = isActive ? selectedColor : evoconnColors.muted;

          if (slot.variant === 'siguiendo') {
            return (
              <TouchableOpacity key={id} onPress={onSiguiendoPress} style={styles.tab}>
                <View style={styles.siguendoRow}>
                  <Text
                    style={[styles.label, { fontSize: tabFontSize }, isActive && { color: selectedColor }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Ionicons
                    name={followingMenuOpen ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={chevronColor}
                    style={styles.siguendoChevron}
                  />
                </View>
                {isActive ? (
                  <View
                    style={[
                      styles.tabUnderline,
                      uw == null
                        ? {
                            left: 0,
                            right: 0,
                            backgroundColor: selectedColor,
                            height: th,
                          }
                        : {
                            width: uw,
                            height: th,
                            backgroundColor: selectedColor,
                            left: '50%',
                            marginLeft: -uw / 2,
                          },
                    ]}
                  />
                ) : null}
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={id} onPress={() => onTabChange(id)} style={styles.tab}>
              {id === 'search' ? (
                <View
                  style={[
                    styles.searchFrame,
                    {
                      width: lupitaPx,
                      height: lupitaPx,
                      transform: [{ translateX: lupEd.offsetX }, { translateY: lupEd.offsetY }],
                    },
                  ]}
                >
                  <LupitaIcon width={lupitaPx} height={lupitaPx} />
                </View>
              ) : (
                <Text
                  style={[styles.label, { fontSize: tabFontSize }, isActive && { color: selectedColor }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              )}
              {isActive && (
                <View
                  style={[
                    styles.tabUnderline,
                    uw == null
                      ? {
                          left: 0,
                          right: 0,
                          backgroundColor: selectedColor,
                          height: th,
                          ...(lupUnderlineShiftX !== 0
                            ? { transform: [{ translateX: lupUnderlineShiftX }] }
                            : {}),
                        }
                      : {
                          width: uw,
                          height: th,
                          backgroundColor: selectedColor,
                          left: '50%',
                          marginLeft: -uw / 2 + lupUnderlineShiftX,
                        },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={followingMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFollowingMenuOpen(false)}
      >
        <View style={styles.sortModalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setFollowingMenuOpen(false)}
            accessibilityRole="button"
          />
          <View
            style={[
              styles.sortMenuCard,
              { marginBottom: sortMenuBottomOffset, width: screenW },
            ]}
          >
            {FOLLOWING_SORT_MENU_ORDER.map((opt) => {
              const selected = followingSort === opt;
              const BgSvg = getFollowingSortDropdownBackgroundSvg(activeClan, opt);
              return (
                <Pressable
                  key={opt}
                  onPress={() => onPickFollowingSort(opt)}
                  style={({ pressed }) => [
                    styles.sortMenuRowPressable,
                    pressed && styles.sortMenuRowPressablePressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={FOLLOWING_SORT_LABELS[opt]}
                >
                  <View style={styles.sortMenuRowSvgWrap}>
                    <View style={styles.sortMenuRowSvgBgWrap} pointerEvents="none">
                      <BgSvg
                        width="100%"
                        height="100%"
                        viewBox={FOLLOWING_SORT_DROPDOWN_VIEWBOX}
                        preserveAspectRatio="none"
                      />
                    </View>
                    <View
                      style={[
                        styles.sortMenuLabelSvgWrap,
                        {
                          transform: [
                            {
                              translateY: BOTTOM_BAR_LAYOUT.FOLLOWING_SORT_DROPDOWN_TEXT_UNIVERSAL_OFFSET_Y,
                            },
                          ],
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.sortMenuLabelSvgText,
                          selected && { color: selectedColor, fontWeight: '700' as const },
                        ]}
                      >
                        {FOLLOWING_SORT_LABELS[opt]}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCreate}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={closeCreate} accessibilityRole="button" />
          <View
            style={[styles.modalCard, { width: createModalWidth }]}
            pointerEvents="box-none"
          >
            <View style={styles.modalCardInner}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.modalScrollInner}
              >
                <SidebarPngMenuButton
                  config={reflectionModalConfig}
                  source={newReflectionButtonSource}
                  label="NUEVA REFLEXIÓN"
                  accessibilityLabel="Nueva reflexión"
                  menuRowStyle={styles.createMenuRow}
                  textAdjustsFontSizeToFit={false}
                  leftOverlay={{
                    source: newReflectionPlusSource,
                    x: newReflectionPlusLayout.x,
                    y: newReflectionPlusLayout.y,
                    width: newReflectionPlusLayout.width,
                    height: newReflectionPlusLayout.height,
                  }}
                  onPress={onNewReflection}
                />
                <SidebarPngMenuButton
                  config={phraseModalConfig}
                  source={newPhraseButtonSource}
                  label="NUEVA FRASE"
                  accessibilityLabel="Nueva frase"
                  menuRowStyle={[styles.createMenuRow, styles.createMenuRowOverlap]}
                  leftOverlay={{
                    source: newPhrasePlusSource,
                    x: newPhrasePlusLayout.x,
                    y: newPhrasePlusLayout.y,
                    width: newPhrasePlusLayout.width,
                    height: newPhrasePlusLayout.height,
                  }}
                  onPress={onNewPhrase}
                />
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    /** Stretch columns to one height, then each slot centers its content on Y. */
    alignItems: 'stretch',
    minHeight: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
    backgroundColor: evoconnColors.background,
    /** Asimétrico: menos arriba para acercar el bloque al borde superior de la barra. */
    paddingTop: 0,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /** `bottom` negativo baja la raya sin `transform` (así no choca con translateX de la lupa). */
  tabUnderline: {
    position: 'absolute',
    bottom: -BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_TRANSLATE_Y,
  },
  siguendoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' },
  siguendoChevron: { marginLeft: 2 },
  label: {
    color: evoconnColors.muted,
    fontSize: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_TAB_TEXT_SIZE,
    fontWeight: '600',
  },
  searchFrame: { alignItems: 'center', justifyContent: 'center' },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: evoconnColors.background,
  },
  createPlus: {
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    zIndex: 1,
    maxWidth: '100%',
    alignSelf: 'center',
  },
  modalCardInner: {
    backgroundColor: evoconnColors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    maxHeight: '78%',
  },
  modalScrollInner: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  createMenuRow: {
    width: '100%',
    paddingVertical: 0,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
  },
  createMenuRowOverlap: {
    marginTop: -14,
  },
  sortModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  sortMenuCard: {
    width: '100%',
    alignSelf: 'stretch',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  sortMenuRowPressable: {
    width: '100%',
    marginVertical: 0,
    marginHorizontal: 0,
    padding: 0,
  },
  sortMenuRowPressablePressed: {
    opacity: 0.88,
  },
  /**
   * Igual que `bar`: ranura con altura mínima; el contenido se centra en Y dentro del rectángulo
   * (SVG en absolute detrás). La altura crece con el texto.
   */
  sortMenuRowSvgWrap: {
    width: '100%',
    minHeight: BOTTOM_BAR_LAYOUT.FOLLOWING_SORT_DROPDOWN_ROW_MIN_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: evoconnColors.background,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  sortMenuRowSvgBgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  sortMenuLabelSvgWrap: {
    width: '100%',
    zIndex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortMenuLabelSvgText: {
    width: '100%',
    textAlign: 'center',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
