import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { evoconnColors } from '../theme/colors';
import { getClanColor } from '../constants/clanColors';
import { SEARCH_LAYOUT as SL } from '../constants/searchScreenLayout';
import { getClanProfileByHouse } from '../utils/getClanProfileByHouse';
import { mockSearchableUsers } from '../data/mockSearchUsers';
import { searchUsers, type ScoredUser } from '../utils/searchUsers';

const MAX_RECENTS = 10;
const DEBOUNCE_MS = 250;

type SearchScreenProps = {
  onUserPress: (userId: string) => void;
};

export function SearchScreen({ onUserPress }: SearchScreenProps) {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
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

  const results: ScoredUser[] = useMemo(
    () => searchUsers(debouncedQuery, mockSearchableUsers),
    [debouncedQuery],
  );

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
    onUserPress(user.id);
  }, [addRecent, onUserPress]);

  const showResults = debouncedQuery.trim().length > 0;

  const renderResultItem = useCallback(({ item }: { item: ScoredUser }) => {
    const clanColor  = getClanColor(item.clanId);
    const ProfileSvg = getClanProfileByHouse(item.clanId);
    return (
      <TouchableOpacity
        style={[styles.resultItem, { height: SL.resultItemHeight }]}
        activeOpacity={0.7}
        onPress={() => handleUserPress(item)}
      >
        <View style={[styles.avatar, { borderColor: clanColor }]}>
          <ProfileSvg width={36} height={36} />
        </View>
        <View style={styles.resultInfo}>
          <Text style={[styles.resultUsername, { fontSize: SL.fontSize - 2 }]}>
            {item.username}
          </Text>
          <Text style={styles.resultMeta}>
            {item.rank} · {item.followersCount ?? 0} seguidores
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleUserPress]);

  const renderRecentItem = useCallback(({ item }: { item: string }) => (
    <View style={[styles.recentItem, { height: SL.resultItemHeight - 8 }]}>
      <TouchableOpacity
        style={styles.recentTextArea}
        activeOpacity={0.7}
        onPress={() => handleRecentPress(item)}
      >
        <Text style={styles.recentIcon}>🕐</Text>
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
  ), [handleRecentPress, removeRecent]);

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
          placeholder="Buscar usuarios..."
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
        results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResultItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={styles.list}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No se encontraron usuarios</Text>
          </View>
        )
      ) : recentSearches.length > 0 ? (
        <View style={styles.recentsSection}>
          <Text style={styles.recentsTitle}>Búsquedas recientes</Text>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item}
            renderItem={renderRecentItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        </View>
      ) : null}
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: evoconnColors.card,
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
    fontSize: 14,
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
