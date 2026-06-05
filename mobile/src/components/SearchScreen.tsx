import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { evoconnColors } from '../theme/colors';
import { SEARCH_LAYOUT as SL } from '../constants/searchScreenLayout';
import { mockSearchableUsers } from '../data/mockSearchUsers';
import {
  rankSearchUserResults,
  searchUsers,
  type ScoredUser,
  type SearchRankContext,
} from '../utils/searchUsers';
import { searchClans, type ScoredClan } from '../utils/searchClans';
import { UserResultCard } from './UserResultCard';
import { ClanResultCard } from './ClanResultCard';
import { ProfileFollowButton } from './otherProfile/ProfileFollowButton';
import {
  searchSupabaseUsers,
  fetchTopUsersByFollowers,
  fetchFollowersCountsExact,
  type TopUser,
} from '../services/supabaseSocial';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { getClanColor } from '@evoconn/constants/clanColors';
import { useClanRankings } from '@evoconn/hooks/useClanRankings';
import type { User } from '../types';

const MAX_RECENTS = 10;
const DEBOUNCE_MS = 250;
/** Solo mostramos las N coincidencias más relevantes (Supabase + locales). */
const SEARCH_MAX_RESULTS = 10;
/** Búsquedas recientes mostradas bajo la barra (en pequeño). */
const RECENTS_SHOWN = 3;
/** Cuentas destacadas (con más seguidores) mostradas en el feed de búsqueda. */
const FEATURED_COUNT = 5;
/** Persistencia de búsquedas recientes entre sesiones. */
const RECENTS_STORAGE_KEY = '@evoconn/search_recents_v1';

type FeaturedUser = {
  id: string;
  username: string;
  clanId: string | null;
  rank: string;
  followersCount: number;
  avatarUri: string | null;
};

// ── Search result profile icon editors ────────────────────────────────────────
// Affect ONLY the SVG inside each result row — not the row layout.
const SEARCH_PROFILE_ICON_BASE_SIZE = 40; // px — rendered size of the SVG
const SEARCH_PROFILE_ICON_SCALE     = 1.2; // 1 = default
const SEARCH_PROFILE_ICON_OFFSET_X  = 0;   // positive = right
const SEARCH_PROFILE_ICON_OFFSET_Y  = 0;   // positive = down

type SearchScreenProps = {
  onUserPress: (userId: string, username?: string) => void;
  onClanPress: (clanId: string) => void;
};

type SearchListItem =
  | { kind: 'clan'; key: string; score: number; clan: ScoredClan }
  | { kind: 'user'; key: string; score: number; user: ScoredUser };

export function SearchScreen({ onUserPress, onClanPress }: SearchScreenProps) {
  const { profile } = useAuth();
  const { followGraph } = useSimulation();
  const { isBlocked } = useBlockedUsers();
  const myEffectiveClanId = useEffectiveClanId();
  const myClanColor = getClanColor(myEffectiveClanId);
  const { rankedClans } = useClanRankings();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const recentsHydrated = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Hidratar búsquedas recientes desde AsyncStorage (sobreviven a cerrar la app).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTS_STORAGE_KEY);
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((x): x is string => typeof x === 'string'));
        }
      } catch {
        // ignore corrupt storage
      } finally {
        recentsHydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persistir recientes tras la hidratación.
  useEffect(() => {
    if (!recentsHydrated.current) return;
    void AsyncStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  // ── Cuentas destacadas (top por seguidores) ───────────────────────────────
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const top = await fetchTopUsersByFollowers(12);
        if (!cancelled) setTopUsers(top);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const searchRankContext = useMemo<SearchRankContext>(
    () => ({ viewerId: profile?.id, followGraph }),
    [profile?.id, followGraph],
  );

  const [supabaseCandidates, setSupabaseCandidates] = useState<User[]>([]);
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSupabaseCandidates([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const profiles = await searchSupabaseUsers(debouncedQuery);
      if (cancelled) return;
      // Conteos exactos solo para ordenar (no se muestran en la tarjeta).
      const followerCounts = await fetchFollowersCountsExact(profiles.map((p) => p.id));
      if (cancelled) return;
      setSupabaseCandidates(
        profiles.map((p) => ({
          id: p.id,
          username: p.username,
          clanId: p.clanId,
          rank: p.rank as ScoredUser['rank'],
          avatarUri: p.avatarUri ?? null,
          followersCount: followerCounts[p.id] ?? 0,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const localResults = useMemo(
    () => searchUsers(debouncedQuery, mockSearchableUsers, searchRankContext),
    [debouncedQuery, searchRankContext],
  );

  const userResults: ScoredUser[] = useMemo(() => {
    const sbIds = new Set(supabaseCandidates.map((r) => r.id));
    const localOnly = localResults.filter((r) => !sbIds.has(r.id));
    const merged = [...supabaseCandidates, ...localOnly].filter((r) => !isBlocked(r.id));
    const ranked = rankSearchUserResults(debouncedQuery, merged, searchRankContext);
    const top = ranked.slice(0, SEARCH_MAX_RESULTS);
    if (!profile?.id || !myEffectiveClanId) return top;
    return top.map((r) =>
      r.id === profile.id ? { ...r, clanId: myEffectiveClanId } : r,
    );
  }, [
    supabaseCandidates,
    localResults,
    debouncedQuery,
    searchRankContext,
    profile?.id,
    myEffectiveClanId,
    isBlocked,
  ]);

  const clanResults = useMemo(
    () => searchClans(debouncedQuery).slice(0, 3),
    [debouncedQuery],
  );

  // Feed de cuentas destacadas: SOLO cuentas reales (top por seguidores de
  // Supabase). No usamos los usuarios de simulación como relleno para que no
  // parpadeen al entrar antes de cargar las reales.
  const featuredUsers: FeaturedUser[] = useMemo(() => {
    const seen = new Set<string>();
    const out: FeaturedUser[] = [];
    for (const u of topUsers) {
      if (seen.has(u.id)) continue;
      if (profile?.id && u.id === profile.id) continue;
      if (isBlocked(u.id)) continue;
      seen.add(u.id);
      out.push({
        id: u.id,
        username: u.username,
        clanId: u.clanId,
        rank: u.rank,
        followersCount: u.followersCount,
        avatarUri: u.avatarUri ?? null,
      });
    }
    out.sort((a, b) => b.followersCount - a.followersCount);
    return out.slice(0, FEATURED_COUNT);
  }, [topUsers, profile?.id, isBlocked]);

  const listItems: SearchListItem[] = useMemo(() => {
    const items: SearchListItem[] = [
      ...clanResults.map((clan) => ({
        kind: 'clan' as const,
        key: `clan-${clan.id}`,
        score: clan.score,
        clan,
      })),
      ...userResults.map((user) => ({
        kind: 'user' as const,
        key: user.id,
        score: user.score,
        user,
      })),
    ];
    return items.sort((a, b) => b.score - a.score).slice(0, SEARCH_MAX_RESULTS);
  }, [clanResults, userResults]);

  const addRecent = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r !== trimmed);
      return [trimmed, ...filtered].slice(0, MAX_RECENTS);
    });
  }, []);

  const removeRecent = useCallback((term: string) => {
    setRecentSearches((prev) => prev.filter((r) => r !== term));
  }, []);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      addRecent(query.trim());
      Keyboard.dismiss();
    }
  }, [query, addRecent]);

  const handleRecentPress = useCallback((term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    addRecent(term);
  }, [addRecent]);

  const handleUserPress = useCallback((user: ScoredUser) => {
    addRecent(user.username);
    onUserPress(user.id, user.username);
  }, [addRecent, onUserPress]);

  const handleClanPress = useCallback((clan: ScoredClan) => {
    addRecent(clan.name);
    onClanPress(clan.id);
  }, [addRecent, onClanPress]);

  const handleFeaturedUserPress = useCallback((u: FeaturedUser) => {
    addRecent(u.username);
    onUserPress(u.id, u.username);
  }, [addRecent, onUserPress]);

  const handleClanDirectoryPress = useCallback((id: string, name: string) => {
    addRecent(name);
    onClanPress(id);
  }, [addRecent, onClanPress]);

  const showResults = debouncedQuery.trim().length > 0;

  const renderListItem = useCallback(({ item }: { item: SearchListItem }) => {
    if (item.kind === 'clan') {
      return (
        <ClanResultCard
          clanId={item.clan.id}
          name={item.clan.name}
          onPress={() => handleClanPress(item.clan)}
        />
      );
    }
    return (
      <UserResultCard
        id={item.user.id}
        username={item.user.username}
        clanId={item.user.clanId}
        rank={item.user.rank}
        avatarUri={item.user.avatarUri}
        onPress={() => handleUserPress(item.user)}
      />
    );
  }, [handleClanPress, handleUserPress]);

  const renderRecentItem = useCallback(({ item }: { item: string }) => (
    <View style={[styles.recentItem, { height: SL.resultItemHeight - 8 }]}>
      <TouchableOpacity
        style={styles.recentTextArea}
        activeOpacity={0.7}
        onPress={() => handleRecentPress(item)}
      >
        <Ionicons name="time-outline" size={16} color={myClanColor} style={styles.recentIcon} />
        <Text style={styles.recentText} numberOfLines={1}>{item}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => removeRecent(item)}
        hitSlop={10}
        style={styles.recentDelete}
      >
        <Text style={styles.recentDeleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  ), [handleRecentPress, removeRecent, myClanColor]);

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
      <View
        style={[
          styles.inputWrapper,
          {
            height: SL.inputHeight,
            transform: [{ translateY: SL.inputOffsetY }],
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          placeholder="Buscar usuarios o clanes..."
          placeholderTextColor={evoconnColors.muted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { fontSize: SL.fontSize }]}
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={() => { setQuery(''); setDebouncedQuery(''); }}
            style={styles.clearBtn}
            hitSlop={8}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showResults ? (
        listItems.length > 0 ? (
          <FlatList
            data={listItems}
            keyExtractor={(item) => item.key}
            renderItem={renderListItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={styles.list}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No se encontraron usuarios ni clanes</Text>
          </View>
        )
      ) : (
        <ScrollView
          style={styles.browse}
          contentContainerStyle={styles.browseContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {recentSearches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.recentsTitle}>Búsquedas recientes</Text>
              {recentSearches.slice(0, RECENTS_SHOWN).map((item) => (
                <React.Fragment key={item}>{renderRecentItem({ item })}</React.Fragment>
              ))}
            </View>
          ) : null}

          {featuredLoading || featuredUsers.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.recentsTitle}>Cuentas destacadas</Text>
              {featuredLoading ? (
                <ActivityIndicator
                  size="small"
                  color={myClanColor}
                  style={styles.featuredLoader}
                />
              ) : (
                featuredUsers.map((u) => (
                  <UserResultCard
                    key={u.id}
                    id={u.id}
                    username={u.username}
                    clanId={u.clanId}
                    rank={u.rank}
                    avatarUri={u.avatarUri}
                    onPress={() => handleFeaturedUserPress(u)}
                    trailing={
                      <ProfileFollowButton userId={u.id} clanId={u.clanId} mini />
                    }
                  />
                ))
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.recentsTitle}>Clanes</Text>
            {rankedClans.map((clan) => (
              <ClanResultCard
                key={clan.id}
                clanId={clan.id}
                name={clan.name}
                rank={clan.rank}
                onPress={() => handleClanDirectoryPress(clan.id, clan.name)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: evoconnColors.background,
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: evoconnColors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: evoconnColors.text,
    height: '100%',
  },
  clearBtn: {
    marginLeft: 8,
    padding: 4,
  },
  clearBtnText: {
    color: evoconnColors.muted,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  avatarWrap: {
    width: SEARCH_PROFILE_ICON_BASE_SIZE,
    height: SEARCH_PROFILE_ICON_BASE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    color: evoconnColors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultUsername: {
    color: evoconnColors.text,
    fontWeight: '700',
  },
  resultMeta: {
    color: evoconnColors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  recentsSection: {
    flex: 1,
    marginTop: 4,
  },
  browse: {
    flex: 1,
  },
  browseContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 4,
    marginBottom: 16,
  },
  featuredLoader: {
    alignSelf: 'flex-start',
    marginVertical: 16,
    marginLeft: 4,
  },
  recentsTitle: {
    color: evoconnColors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  recentTextArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentIcon: {
    width: 16,
  },
  recentText: {
    color: evoconnColors.text,
    fontSize: 15,
    flex: 1,
  },
  recentDelete: {
    padding: 8,
  },
  recentDeleteText: {
    color: evoconnColors.muted,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: evoconnColors.muted,
    fontSize: 15,
  },
  emptyHint: {
    color: evoconnColors.muted,
    fontSize: 15,
    fontStyle: 'italic',
  },
});
