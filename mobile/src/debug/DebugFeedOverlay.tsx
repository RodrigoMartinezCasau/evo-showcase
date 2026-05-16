/**
 * DebugFeedOverlay — fullscreen modal that previews the feed design
 * using purely fake data (no Supabase, no SimulationContext writes).
 *
 * Shows a "Para Ti" tab (all posts shuffled) and a "Siguiendo" tab
 * (posts from the default followed debug users).
 *
 * Only rendered when __DEV__ && DEBUG_FLOATING_BUTTONS_ENABLED.
 */
import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import type { CommunityPost } from '@evoconn/types';
import {
  DEBUG_POSTS,
  DEBUG_USERS,
  DEBUG_DEFAULT_FOLLOWING,
} from '@evoconn/data/simulation/debugFeedData';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADER_HEIGHT = 52;
const TAB_BAR_HEIGHT = 44;

type TabId = 'foryou' | 'siguiendo';

function shuffled<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DebugFeedOverlay() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('foryou');
  const [following, setFollowing] = useState<Set<string>>(new Set(DEBUG_DEFAULT_FOLLOWING));

  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();

  // Compute item height: full screen minus the overlay's own chrome.
  const chromePx = insets.top + HEADER_HEIGHT + TAB_BAR_HEIGHT + insets.bottom;
  const itemHeight = Math.max(100, screenH - chromePx);

  // Stable shuffled for "Para Ti" (re-shuffles each time overlay opens).
  const forYouPosts = useMemo(() => shuffled(DEBUG_POSTS), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const siguiendoPosts = useMemo(
    () => DEBUG_POSTS.filter(p => following.has(p.author.id)),
    [following],
  );

  const currentData = tab === 'foryou' ? forYouPosts : siguiendoPosts;

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: itemHeight, offset: itemHeight * index, index }),
    [itemHeight],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <ReflectionDetailItem
        post={item}
        itemHeight={itemHeight}
        onAuthorPress={() => {}}
        onClanPress={() => {}}
        communityVerticalFeed
      />
    ),
    [itemHeight],
  );

  const keyExtractor = useCallback((item: CommunityPost) => item.id, []);

  const verticalFeedVisiblePostIdRef = useRef<string | null>(null);
  const verticalFeedViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onVerticalFeedViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: CommunityPost }> }) => {
      const id = viewableItems[0]?.item?.id;
      if (!id) return;
      const prev = verticalFeedVisiblePostIdRef.current;
      verticalFeedVisiblePostIdRef.current = id;
      if (prev !== null && prev !== id) {
        Keyboard.dismiss();
      }
    },
  ).current;

  // ── Following panel ────────────────────────────────────────────────────────
  const [showFollowPanel, setShowFollowPanel] = useState(false);
  const toggleFollow = useCallback((userId: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  return (
    <>
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 165 + insets.bottom }]}
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        accessibilityLabel="Debug: preview feed de clanes"
      >
        <View style={styles.fabDot} />
        <Text style={styles.fabLabel}>FEED</Text>
      </TouchableOpacity>

      {/* Fullscreen modal */}
      <Modal visible={open} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: '#0B0B0F' }]}>

          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>DEBUG — FEED CLANES</Text>
            <TouchableOpacity
              onPress={() => setShowFollowPanel(v => !v)}
              style={styles.followBtn}
              hitSlop={8}
            >
              <Text style={styles.followBtnTxt}>SIGUIENDO ···</Text>
            </TouchableOpacity>
          </View>

          {/* Follow picker */}
          {showFollowPanel && (
            <View style={styles.followPanel}>
              {DEBUG_USERS.map(u => {
                const color = u.clanId ? CLAN_TO_COLOR[u.clanId as keyof typeof CLAN_TO_COLOR] : '#c7ff02';
                const isFollowing = following.has(u.id);
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.followRow, isFollowing && styles.followRowActive]}
                    onPress={() => toggleFollow(u.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.followSwatch, { backgroundColor: color }]} />
                    <Text style={[styles.followName, isFollowing && styles.followNameActive]}>
                      {u.username}
                    </Text>
                    {isFollowing && <Text style={styles.followCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Tab bar */}
          <View style={styles.tabBar}>
            <TabBtn label="Para Ti" active={tab === 'foryou'} onPress={() => setTab('foryou')} />
            <TabBtn
              label={`Siguiendo (${siguiendoPosts.length})`}
              active={tab === 'siguiendo'}
              onPress={() => setTab('siguiendo')}
            />
          </View>

          {/* Feed */}
          {currentData.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>
                {tab === 'siguiendo'
                  ? 'No sigues a nadie. Pulsa "SIGUIENDO ···" para añadir usuarios.'
                  : 'Sin posts.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={currentData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              windowSize={3}
              maxToRenderPerBatch={2}
              initialNumToRender={1}
              removeClippedSubviews={false}
              style={{ flex: 1 }}
              viewabilityConfig={verticalFeedViewabilityConfig}
              onViewableItemsChanged={onVerticalFeedViewableItemsChanged}
            />
          )}

          {/* Bottom safe area spacer */}
          <View style={{ height: insets.bottom }} />
        </View>
      </Modal>
    </>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{label}</Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,25,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  fabDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
    backgroundColor: '#c7ff02',
  },
  fabLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  root: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT + 52, // includes paddingTop for safe area
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  closeTxt: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  followBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  followBtnTxt: {
    color: '#c7ff02',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  followPanel: {
    backgroundColor: '#14141A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  followRowActive: {
    backgroundColor: 'rgba(199,255,2,0.08)',
    borderColor: 'rgba(199,255,2,0.3)',
  },
  followSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  followName: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  followNameActive: {
    color: '#fff',
  },
  followCheck: {
    color: '#c7ff02',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#0B0B0F',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {},
  tabTxt: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tabTxtActive: {
    color: '#fff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#c7ff02',
    borderRadius: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTxt: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
