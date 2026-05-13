/**
 * PersonalFollowersScreen — shows the list of people who follow the current user.
 * Opens when the user taps "Seguidores" in the personal profile.
 *
 * Each row: clan profile icon · username · rank/clan · "Seguir de vuelta" / "Siguiendo" button.
 * Uses PersonalProfileContext for reactive follow-back state.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { evoconnColors } from '@evoconn/theme/colors';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { BOTTOM_BAR_LAYOUT, getBottomBarScrollContentPaddingBottom } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import type { FollowerEntry } from '@evoconn/data/mockPersonalProfile';

const AVATAR_SIZE = 42;
const PROFILE_ICON_SCALE = 1.1;

function FollowerRow({
  follower,
  isFollowingBack,
  onFollowBack,
  onUnfollowBack,
  onUserPress,
}: {
  follower: FollowerEntry;
  isFollowingBack: boolean;
  onFollowBack: (id: string) => void;
  onUnfollowBack: (id: string) => void;
  onUserPress: (id: string) => void;
}) {
  const clanLabel = follower.clanId
    ? follower.clanId.charAt(0).toUpperCase() + follower.clanId.slice(1)
    : 'Sin clan';
  const rankLabel = follower.rank
    ? follower.rank.charAt(0).toUpperCase() + follower.rank.slice(1)
    : null;

  return (
    <View style={styles.row}>
      {/* Avatar — tappable to open profile */}
      <TouchableOpacity
        onPress={() => onUserPress(follower.id)}
        activeOpacity={0.6}
        hitSlop={4}
      >
        <View style={styles.avatarWrap}>
          <UserAvatarFrame
            clanId={follower.clanId}
            avatarUri={follower.avatarUri}
            size={AVATAR_SIZE}
            iconScale={PROFILE_ICON_SCALE}
          />
        </View>
      </TouchableOpacity>

      {/* Info — tappable to open profile (separate hitbox from action button) */}
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => onUserPress(follower.id)}
        activeOpacity={0.6}
      >
        <Text style={styles.username} numberOfLines={1}>
          {follower.username}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[rankLabel, clanLabel].filter(Boolean).join(' · ')}
        </Text>
      </TouchableOpacity>

      {/* Follow-back button */}
      {isFollowingBack ? (
        <TouchableOpacity
          style={[styles.btn, styles.btnFollowing]}
          onPress={() => onUnfollowBack(follower.id)}
          activeOpacity={0.75}
        >
          <Text style={[styles.btnText, styles.btnTextFollowing]}>Siguiendo</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btn, styles.btnFollow]}
          onPress={() => onFollowBack(follower.id)}
          activeOpacity={0.75}
        >
          <Text style={[styles.btnText, styles.btnTextFollow]}>Seguir de vuelta</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PersonalFollowersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const {
    followers,
    followingBackIds,
    followBack,
    unfollowBack,
    isFollowingBack,
  } = usePersonalProfile();

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const handleUserPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/profile/[id]', params: { id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: FollowerEntry }) => (
      <FollowerRow
        follower={item}
        isFollowingBack={isFollowingBack(item.id)}
        onFollowBack={followBack}
        onUnfollowBack={unfollowBack}
        onUserPress={handleUserPress}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [followingBackIds, followBack, unfollowBack, isFollowingBack, handleUserPress],
  );

  const listPanelHeight =
    getMainColumnHeightForFloatingBottomBar(
      screenH,
      insets.top,
      insets.bottom,
      safeFrame.height,
    ) - BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>SEGUIDORES</Text>
      </View>

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        <FlatList
          style={{ flex: 1 }}
          data={followers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: getBottomBarScrollContentPaddingBottom(
              insets.bottom,
              screenH,
              safeFrame.height,
            ),
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      <AppShellBottomTabsWrap
        backgroundColor="#0b0b0f"
        borderTopColor="rgba(255,255,255,0.06)"
      >
        <BottomCommunityTabs activeTab={null} onTabChange={handleTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    marginRight: 8,
  },
  screenTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  screenCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  btn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  btnFollow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  btnFollowing: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnTextFollow: {
    color: '#000000',
  },
  btnTextFollowing: {
    color: 'rgba(255,255,255,0.6)',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 16 + AVATAR_SIZE + 12,
  },
});
