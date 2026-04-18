/**
 * PersonalFriendsScreen — shows mutual friends (following ∩ followers).
 * Opens when the user taps the "Amigos" block in the personal profile.
 *
 * Same visual language as PersonalFollowingScreen / PersonalFollowersScreen.
 * Each row shows "Siguiendo"; tapping unfollows and removes from the list.
 * Derived from PersonalProfileContext so state is always in sync.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import { getClanProfileByHouse } from '@evoconn/utils/getClanProfileByHouse';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import type { FollowingEntry } from '@evoconn/data/mockPersonalProfile';

const AVATAR_SIZE = 42;
const PROFILE_ICON_SCALE = 1.1;

function FriendRow({
  user,
  onUnfollow,
  onUserPress,
}: {
  user: FollowingEntry;
  onUnfollow: (id: string) => void;
  onUserPress: (id: string) => void;
}) {
  const ProfileSvg = getClanProfileByHouse(user.clanId);
  const clanLabel = user.clanId
    ? user.clanId.charAt(0).toUpperCase() + user.clanId.slice(1)
    : 'Sin clan';
  const rankLabel = user.rank
    ? user.rank.charAt(0).toUpperCase() + user.rank.slice(1)
    : null;

  return (
    <View style={styles.row}>
      {/* Avatar — tappable to open profile */}
      <TouchableOpacity onPress={() => onUserPress(user.id)} activeOpacity={0.6} hitSlop={4}>
        <View style={styles.avatarWrap}>
          <View style={{ transform: [{ scale: PROFILE_ICON_SCALE }] }}>
            <ProfileSvg width={AVATAR_SIZE} height={AVATAR_SIZE} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Info — tappable to open profile (separate hitbox from action button) */}
      <TouchableOpacity style={styles.userInfo} onPress={() => onUserPress(user.id)} activeOpacity={0.6}>
        <Text style={styles.username} numberOfLines={1}>
          {user.username}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[rankLabel, clanLabel].filter(Boolean).join(' · ')}
        </Text>
      </TouchableOpacity>

      {/* Siguiendo button — tap to unfollow */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => onUnfollow(user.id)}
        activeOpacity={0.75}
      >
        <Text style={styles.btnText}>Siguiendo</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PersonalFriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeTab] = React.useState<TabId>('feed');

  const { friends, unfollowUser } = usePersonalProfile();

  const handleUserPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/profile/[id]', params: { id } });
    },
    [router],
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const bottomBarH =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;

  const renderItem = useCallback(
    ({ item }: { item: FollowingEntry }) => (
      <FriendRow user={item} onUnfollow={unfollowUser} onUserPress={handleUserPress} />
    ),
    [unfollowUser, handleUserPress],
  );

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>AMIGOS</Text>
      </View>

      <FlatList
        data={friends}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomBarH + 8 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Sin amigos mutuos aún</Text>
          </View>
        }
      />

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
        <BottomCommunityTabs activeTab={activeTab} onTabChange={handleTabChange} />
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
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 16 + AVATAR_SIZE + 12,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  bottomTabsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0b0b0f',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
});
