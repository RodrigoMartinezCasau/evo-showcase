import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Modal,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  PersonalFollowRow,
  PersonalIdentityHeader,
  PersonalInsigniaPhrase,
  PersonalRankProgression,
  PersonalPhilosophyPanel,
  PersonalRecentPostsSlider,
  PersonalBottomBlocks,
} from '@evoconn/components/personalProfile';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import type { CommunityPost } from '@evoconn/types';

const ANIM_DURATION = 200;

export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { profile: authProfile } = useAuth();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { thoughts } = useThoughts();
  const classification = useClassification();
  const { isPreviewActive } = usePreviewMode();

  const profile = getPersonalProfile();
  // Real per-user philosophical percentages from the classification engine.
  const realPercentages = classification.getPercentages(profile.id);
  // Overlay Supabase identity fields so real users see their own data,
  // not the rodrigomartinez simulation fallback.
  const profileWithClan = {
    ...profile,
    clanId: activeClan,
    philosophyPercentages: realPercentages,
    rank: classification.getDisplayRank(profile.id),
    insigniaPhrase: authProfile?.insignia_phrase ?? profile.insigniaPhrase,
    totalReflections: authProfile?.total_reflections ?? profile.totalReflections,
    totalQuotes: authProfile?.total_quotes ?? profile.totalQuotes,
  };

  // ─── Personal profile shared state ────────────────────────────────
  const { posts, isHidden, toggleHidePost, deletePost, friends, savedPosts } = usePersonalProfile();

  // ─── Insignia phrase local state (ready for backend integration) ──
  const [insigniaPhrase, setInsigniaPhrase] = useState(profileWithClan.insigniaPhrase);
  const [phraseEditorOpen, setPhraseEditorOpen] = useState(false);
  const [phraseEditDraft, setPhraseEditDraft] = useState('');

  const handlePhraseEditOpen = useCallback(() => {
    setPhraseEditDraft(insigniaPhrase);
    setPhraseEditorOpen(true);
  }, [insigniaPhrase]);

  const handlePhraseEditSave = useCallback(() => {
    const trimmed = phraseEditDraft.trim();
    if (trimmed.length > 0) {
      setInsigniaPhrase(trimmed);
    }
    setPhraseEditorOpen(false);
  }, [phraseEditDraft]);

  const handlePhraseEditCancel = useCallback(() => {
    setPhraseEditorOpen(false);
  }, []);

  // Top bar height (matches OtherUserProfileView calculation).
  const topBarHeight = 60 + insets.top;
  // Bottom bar height — used for scroll padding and detail panel item height.
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  // Content area height: profile wrap stops exactly above the bottom bar,
  // matching the OtherUserProfileView layout so the rounded bottom corners
  // of ReflectionBackground's bgClip are visually above the bottom tab bar.
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

  // ProfileDetailPanel still needs an explicit pixel height.
  const contentHeightRef = useRef(0);
  const onProfileWrapLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      contentHeightRef.current = e.nativeEvent.layout.height;
    },
    [],
  );

  // ─── Expanded post detail panel ────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [detailFeed, setDetailFeed] = useState<{
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  const openDetailFeed = useCallback(
    (posts: CommunityPost[], postId: string) => {
      const idx = posts.findIndex((p) => p.id === postId);
      setDetailFeed({ data: posts, initialIndex: idx >= 0 ? idx : 0 });
      slideAnim.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim],
  );

  const closeDetailFeed = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDetailFeed(null);
    });
  }, [slideAnim]);

  const handleRecentPostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(posts, post.id);
    },
    [openDetailFeed, posts],
  );

  const handlePostMenuAction = useCallback(
    (action: 'hide' | 'delete', postId: string) => {
      if (action === 'hide') toggleHidePost(postId);
      else deletePost(postId);
    },
    [toggleHidePost, deletePost],
  );

  const handleSavedPostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(savedPosts, post.id);
    },
    [openDetailFeed, savedPosts],
  );

  const handleDetailAuthorPress = useCallback(
    (userId: string) => {
      if (userId === mockCurrentUser.id) {
        // Already on personal profile — just close the panel
        closeDetailFeed();
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: userId } });
      }
    },
    [closeDetailFeed, router],
  );

  const handleDetailClanPress = useCallback(
    (clanId: string) => {
      router.push({ pathname: '/clan/[id]', params: { id: clanId } });
    },
    [router],
  );

  const handleBottomTabChange = useCallback((tab: TabId) => {
    // Always navigate immediately — replacing the route unmounts this screen
    // along with any open detail overlay, so no explicit closeDetailFeed needed.
    router.replace({ pathname: '/(tabs)', params: { tab } });
  }, [router]);

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => {/* already on personal profile */}}
      />

      <View style={[styles.profileWrap, { height: contentHeight }]} onLayout={onProfileWrapLayout}>
        <ReflectionBackground clan={profileWithClan.clanId}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <PersonalFollowRow
              userId={profileWithClan.id}
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              followersCount={profileWithClan.followersCount}
              followingCount={profileWithClan.followingCount}
              totalPosts={posts.length}
              onPostsPress={() => router.push('/personal-posts')}
              onFollowersPress={() => router.push('/personal-followers')}
              onFollowingPress={() => router.push('/personal-following')}
            />
            <View style={styles.contentGap} />
            <PersonalIdentityHeader
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              rank={profileWithClan.rank}
              onShieldPress={profileWithClan.clanId ? () => router.push({ pathname: '/clan/[id]', params: { id: profileWithClan.clanId! } }) : undefined}
            />
            <View style={styles.contentGap} />
            <PersonalInsigniaPhrase phrase={insigniaPhrase} onEdit={handlePhraseEditOpen} />
            <View style={styles.contentGap} />
            <PersonalRankProgression
              rank={profileWithClan.rank}
              clanId={profileWithClan.clanId}
              totalReflections={thoughts.length}
              onPress={profileWithClan.clanId ? () => router.push('/philosophy-profile') : undefined}
            />
            <View style={styles.contentGap} />
            <PersonalPhilosophyPanel
              percentages={profileWithClan.philosophyPercentages}
              clanId={profileWithClan.clanId}
              onPress={() => router.push('/philosophy-profile')}
              allowLockedAccess={isPreviewActive}
            />
            <View style={styles.contentGap} />
            <PersonalRecentPostsSlider
              posts={posts}
              onPostPress={handleRecentPostPress}
              onMenuAction={handlePostMenuAction}
              isHiddenFn={isHidden}
            />
            <View style={styles.contentGap} />
            <PersonalBottomBlocks
              clanId={profileWithClan.clanId}
              friends={friends}
              savedPosts={savedPosts}
              onSavedPostPress={handleSavedPostPress}
            />
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </ReflectionBackground>

        {/* Expanded post viewer — slides in over profile content */}
        {detailFeed !== null && (
          <ProfileDetailPanel
            data={detailFeed.data}
            initialIndex={detailFeed.initialIndex}
            itemHeight={contentHeightRef.current}
            slideAnim={slideAnim}
            screenW={screenW}
            onClose={closeDetailFeed}
            onAuthorPress={handleDetailAuthorPress}
            onClanPress={handleDetailClanPress}
          />
        )}
      </View>

      <View
        style={[
          styles.bottomTabsWrap,
          {
            paddingBottom: insets.bottom + BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION,
            paddingHorizontal: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HORIZONTAL_PADDING,
            bottom: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET,
            borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BORDER_RADIUS,
          },
        ]}
      >
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </View>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
      />

      {/* ── Insignia phrase editor modal ── */}
      <Modal
        visible={phraseEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={handlePhraseEditCancel}
      >
        <KeyboardAvoidingView
          style={editorStyles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={editorStyles.backdropTap}
            activeOpacity={1}
            onPress={handlePhraseEditCancel}
          />
          <View style={editorStyles.sheet}>
            <Text style={editorStyles.title}>Editar frase insignia</Text>
            <TextInput
              style={editorStyles.input}
              value={phraseEditDraft}
              onChangeText={setPhraseEditDraft}
              multiline
              maxLength={80}
              placeholder="Escribe tu frase..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoFocus
              selectionColor="#FFFFFF"
            />
            <Text style={editorStyles.counter}>{phraseEditDraft.length}/80</Text>
            <View style={editorStyles.buttons}>
              <TouchableOpacity style={editorStyles.cancelBtn} onPress={handlePhraseEditCancel}>
                <Text style={editorStyles.cancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={editorStyles.saveBtn} onPress={handlePhraseEditSave}>
                <Text style={editorStyles.saveTxt}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const editorStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
    letterSpacing: 0.2,
    padding: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  counter: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'right',
    marginTop: -8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  cancelTxt: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  saveTxt: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  profileWrap: {
    overflow: 'hidden',
  },
  content: {
    paddingTop: 24,
  },
  contentGap: {
    height: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  bottomTabsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: evoconnColors.background,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
  },
});
