import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import {
  PersonalFollowRow,
  PersonalIdentityHeader,
  PersonalInsigniaPhrase,
  PersonalRankProgression,
  PersonalPhilosophyPanel,
  PersonalRecentPostsSlider,
  PersonalBottomBlocks,
} from '@evoconn/components/personalProfile';
import {
  ProfileShareCaptureHost,
  type ProfileShareCaptureHandle,
} from '@evoconn/components/personalProfile/ProfileShareCaptureHost';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { supabase } from '../../mobile/lib/supabase';
import type { CommunityPost } from '@evoconn/types';

const ANIM_DURATION = 200;

export default function PersonalProfileScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { profile: authProfile, session, refreshProfile } = useAuth();
  const { activeFollowersCount, activeFollowingCount } = useSimulation();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ready = useDeferredRender();

  // Render por trozos: primero las secciones ligeras (armazón visible al
  // instante tras la transición), y las pesadas (panel filosófico, slider de
  // posts, bloques) un par de frames después. Evita montar TODO el árbol de
  // SVG en un solo frame, que es lo que congelaba la pantalla 5-7s al entrar.
  const [heavyReady, setHeavyReady] = useState(false);
  useEffect(() => {
    if (!ready) {
      setHeavyReady(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setHeavyReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [ready]);
  const { thoughts } = useThoughts();
  const classification = useClassification();
  const { isPreviewActive } = usePreviewMode();

  // Mock profile is a pure derivation from mockCurrentUser; memoise once per
  // user/clan so children that read profileWithClan don't re-render on every
  // unrelated context update.
  const profile = useMemo(() => getPersonalProfile(), [
    // mockCurrentUser is mutable; depend on the bits that actually flow into
    // getPersonalProfile so we recompute when the active user identity changes.
    mockCurrentUser.id,
    mockCurrentUser.username,
    mockCurrentUser.clanId,
    mockCurrentUser.rank,
    mockCurrentUser.avatarUri,
  ]);

  // Real per-user philosophical percentages from the classification engine.
  const realPercentages = useMemo(
    () => classification.getPercentages(profile.id),
    [classification, profile.id],
  );
  const displayRank = useMemo(
    () => classification.getDisplayRank(profile.id),
    [classification, profile.id],
  );
  const reflectionCount = useMemo(
    () => classification.getReflectionCount(profile.id),
    [classification, profile.id],
  );
  const phraseCount = useMemo(
    () => classification.getPhraseCount(profile.id),
    [classification, profile.id],
  );

  // Overlay Supabase identity fields so real users see their own data,
  // not the rodrigomartinez simulation fallback.
  const profileWithClan = useMemo(() => ({
    ...profile,
    username: authProfile?.username
      ? '@' + authProfile.username.toUpperCase()
      : profile.username,
    clanId: activeClan,
    philosophyPercentages: realPercentages,
    rank: displayRank,
    insigniaPhrase: authProfile?.insignia_phrase ?? profile.insigniaPhrase,
    totalReflections: authProfile?.total_reflections ?? profile.totalReflections,
    totalQuotes: authProfile?.total_quotes ?? profile.totalQuotes,
  }), [
    profile,
    authProfile?.username,
    activeClan,
    realPercentages,
    displayRank,
    authProfile?.insignia_phrase,
    authProfile?.total_reflections,
    authProfile?.total_quotes,
  ]);

  // ─── Personal profile shared state ────────────────────────────────
  const { posts, isHidden, toggleHidePost, deletePost, friends, savedPosts } = usePersonalProfile();

  // ─── Insignia phrase: Supabase `profiles.insignia_phrase` + UI state ──
  const [insigniaPhrase, setInsigniaPhrase] = useState(profileWithClan.insigniaPhrase);
  const [phraseEditorOpen, setPhraseEditorOpen] = useState(false);
  const [phraseEditDraft, setPhraseEditDraft] = useState('');
  const [phraseSaving, setPhraseSaving] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const profileShareCaptureRef = useRef<ProfileShareCaptureHandle>(null);

  useEffect(() => {
    if (phraseEditorOpen) return;
    setInsigniaPhrase(authProfile?.insignia_phrase ?? profile.insigniaPhrase);
  }, [phraseEditorOpen, authProfile?.insignia_phrase, authProfile?.id, profile.insigniaPhrase]);

  const handlePhraseEditOpen = useCallback(() => {
    setPhraseEditDraft(insigniaPhrase);
    setPhraseEditorOpen(true);
  }, [insigniaPhrase]);

  const handlePhraseEditSave = useCallback(async () => {
    const trimmed = phraseEditDraft.trim();
    if (trimmed.length === 0) {
      setPhraseEditorOpen(false);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      setInsigniaPhrase(trimmed);
      setPhraseEditorOpen(false);
      return;
    }

    setPhraseSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ insignia_phrase: trimmed })
        .eq('id', userId)
        .select('insignia_phrase')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Alert.alert(
          'No se guardó',
          'No se pudo actualizar la frase. Revisa que exista la política RLS de actualización en la tabla profiles (ver supabase_profiles_username_rls.sql).',
        );
        return;
      }

      setInsigniaPhrase(trimmed);
      await refreshProfile();
      setPhraseEditorOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la frase.';
      Alert.alert('Error', msg);
    } finally {
      setPhraseSaving(false);
    }
  }, [phraseEditDraft, session?.user?.id, refreshProfile]);

  const handlePhraseEditCancel = useCallback(() => {
    setPhraseEditorOpen(false);
  }, []);

  // Misma altura de cuerpo que Para Ti (`AppTopBar` real + reserva de barra inferior).
  const contentHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

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
      router.push({
        pathname: '/latest-posts',
        params: { postId: post.id, userId: profileWithClan.id },
      });
    },
    [router, profileWithClan.id],
  );

  const handleSeeMoreRecentPosts = useCallback(() => {
    router.push({ pathname: '/latest-posts', params: { userId: profileWithClan.id } });
  }, [router, profileWithClan.id]);

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
        navigateUnlessCurrent(pathname, `/profile/${userId}`);
      }
    },
    [closeDetailFeed, router],
  );

  const handleDetailClanPress = useCallback(
    (clanId: string) => {
      navigateUnlessCurrent(pathname, `/clan/${String(clanId).trim().toLowerCase()}`);
    },
    [pathname],
  );

  const handleShareProfile = useCallback(async () => {
    if (sharePreparing) return;
    setSharePreparing(true);
    try {
      await profileShareCaptureRef.current?.share({
        width: screenW,
        userId: profileWithClan.id,
        username: profileWithClan.username,
        clanId: profileWithClan.clanId,
        rank: profileWithClan.rank,
        insigniaPhrase,
        followersCount: activeFollowersCount,
        followingCount: activeFollowingCount,
        totalPosts: posts.length,
        totalReflections: profileWithClan.totalReflections,
        totalQuotes: profileWithClan.totalQuotes,
        rankReflectionCount: reflectionCount,
        rankPhraseCount: phraseCount,
        philosophyPercentages: profileWithClan.philosophyPercentages,
        posts,
      });
    } catch (e) {
      if (__DEV__) console.warn('[PersonalProfile] share:', e);
      Alert.alert('Error', 'No se pudo compartir el perfil. Inténtalo de nuevo.');
    } finally {
      setSharePreparing(false);
    }
  }, [
    sharePreparing,
    screenW,
    profileWithClan,
    insigniaPhrase,
    activeFollowersCount,
    activeFollowingCount,
    posts,
    reflectionCount,
    phraseCount,
  ]);

  const handleBottomTabChange = useCallback((tab: TabId) => {
    // Always navigate immediately — replacing the route unmounts this screen
    // along with any open detail overlay, so no explicit closeDetailFeed needed.
    router.navigate({ pathname: '/(tabs)', params: { tab } });
  }, [router]);

  // Stable callbacks so SidebarDrawer (React.memo'd) doesn't re-render on every
  // parent render.
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarConversationPress = useCallback(
    (id: string) => {
      setSidebarOpen(false);
      router.push({ pathname: '/reflection', params: { thoughtId: id } });
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={handleOpenSidebar}
      />

      <View style={[styles.profileWrap, { height: contentHeight }]} onLayout={onProfileWrapLayout}>
        <ReflectionBackground clan={profileWithClan.clanId}>
        {!ready ? (
          <ClanLoadingDot clanId={profileWithClan.clanId} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <PersonalFollowRow
              userId={profileWithClan.id}
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              followersCount={activeFollowersCount}
              followingCount={activeFollowingCount}
              totalPosts={posts.length}
              onPostsPress={() => router.push('/personal-posts')}
              onFollowersPress={() => router.push('/personal-followers')}
              onFollowingPress={() => router.push('/personal-following')}
            />
            <View style={styles.contentGap} />
            <PersonalIdentityHeader
              userId={profileWithClan.id}
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              rank={profileWithClan.rank}
              onSharePress={() => void handleShareProfile()}
              onShieldPress={
                profileWithClan.clanId
                  ? () =>
                      navigateUnlessCurrent(
                        pathname,
                        `/clan/${String(profileWithClan.clanId).trim().toLowerCase()}`,
                      )
                  : undefined
              }
            />
            <View style={styles.contentGap} />
            <PersonalInsigniaPhrase phrase={insigniaPhrase} onEdit={handlePhraseEditOpen} />
            <View style={styles.contentGap} />
            <PersonalRankProgression
              rank={profileWithClan.rank}
              clanId={profileWithClan.clanId}
              totalReflections={reflectionCount}
              totalPhrases={phraseCount}
              onPress={profileWithClan.clanId ? () => navigateUnlessCurrent(pathname, '/philosophy-profile') : undefined}
            />
            {heavyReady ? (
              <>
                <View style={styles.contentGap} />
                <PersonalPhilosophyPanel
                  percentages={profileWithClan.philosophyPercentages}
                  clanId={profileWithClan.clanId}
                  onPress={() => navigateUnlessCurrent(pathname, '/philosophy-profile')}
                  allowLockedAccess={isPreviewActive}
                />
                <View style={styles.contentGap} />
                <PersonalRecentPostsSlider
                  posts={posts}
                  onPostPress={handleRecentPostPress}
                  onMenuAction={handlePostMenuAction}
                  isHiddenFn={isHidden}
                  onSeeMorePress={handleSeeMoreRecentPosts}
                />
                <View style={styles.contentGap} />
                <PersonalBottomBlocks
                  clanId={profileWithClan.clanId}
                  friends={friends}
                  savedPosts={savedPosts}
                  onSavedPostPress={handleSavedPostPress}
                />
              </>
            ) : null}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
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

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={handleCloseSidebar}
        conversations={thoughts}
        onConversationPress={handleSidebarConversationPress}
      />

      <ProfileShareCaptureHost ref={profileShareCaptureRef} />

      {/* ── Insignia phrase editor modal ── */}
      <Modal
        visible={phraseEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!phraseSaving) handlePhraseEditCancel();
        }}
      >
        <KeyboardAvoidingView
          style={editorStyles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={editorStyles.backdropTap}
            activeOpacity={1}
            onPress={() => {
              if (!phraseSaving) handlePhraseEditCancel();
            }}
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
              <TouchableOpacity
                style={editorStyles.cancelBtn}
                onPress={handlePhraseEditCancel}
                disabled={phraseSaving}
              >
                <Text style={editorStyles.cancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[editorStyles.saveBtn, phraseSaving && editorStyles.saveBtnDisabled]}
                onPress={() => void handlePhraseEditSave()}
                disabled={phraseSaving}
              >
                {phraseSaving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={editorStyles.saveTxt}>Guardar</Text>
                )}
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
  saveBtnDisabled: {
    opacity: 0.55,
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
});
