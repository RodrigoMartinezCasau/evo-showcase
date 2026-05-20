import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { getClanCardColor } from '@evoconn/theme/theme';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  FeedbackWidget,
  VoteWidget,
  ClanBanner,
  CommentItem,
  RankBadge,
} from '@evoconn/components';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { getPostById, updatePostVote, updatePostSaveToggle } = useFeedStore();
  const post = id ? getPostById(id) : undefined;

  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [saved, setSaved] = useState(false);
  const votedRef = useRef<'up' | 'down' | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    setVoted(null);
    setSaved(false);
    votedRef.current = null;
    savedRef.current = false;
  }, [post?.id]);

  const handleUp = useCallback(() => {
    if (!post) return;
    const prev = votedRef.current;
    const next = prev === 'up' ? null : 'up';
    votedRef.current = next;
    updatePostVote(post.id, prev, next);
    setVoted(next);
  }, [post, updatePostVote]);

  const handleDown = useCallback(() => {
    if (!post) return;
    const prev = votedRef.current;
    const next = prev === 'down' ? null : 'down';
    votedRef.current = next;
    updatePostVote(post.id, prev, next);
    setVoted(next);
  }, [post, updatePostVote]);

  const handleSave = useCallback(() => {
    if (!post) return;
    const was = savedRef.current;
    const now = !was;
    savedRef.current = now;
    updatePostSaveToggle(post.id, was, now);
    setSaved(now);
  }, [post, updatePostSaveToggle]);

  if (!post) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.notFound}>Publicación no encontrada</Text>
      </View>
    );
  }

  const clanColor = getClanCardColor(post.author.clanId);
  const clanLabel = post.author.clanId ? String(post.author.clanId).toUpperCase() : 'EVOCONN';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>
        <FeedbackWidget />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigateUnlessCurrent(pathname, `/profile/${post.author.id}`)}>
            <Text style={styles.username}>{post.author.username}</Text>
          </TouchableOpacity>
          <View style={styles.badges}>
            <TouchableOpacity
              onPress={() => {
                if (post.author.clanId) {
                  navigateUnlessCurrent(pathname, `/clan/${post.author.clanId}`);
                }
              }}
              disabled={!post.author.clanId}
            >
              <ClanBanner clanId={post.author.clanId} shortLabel={clanLabel} />
            </TouchableOpacity>
            <RankBadge rank={post.author.rank} />
          </View>
        </View>
        <View style={[styles.cardContent, { borderLeftColor: clanColor }]}>
          {post.type === 'reflection' && post.title && (
            <Text style={styles.title}>{post.title}</Text>
          )}
          <Text style={styles.body}>{post.body}</Text>
        </View>
        <View style={styles.voteRow}>
          <VoteWidget stats={post.voteStats} onUp={handleUp} onDown={handleDown} onSave={handleSave} />
        </View>
        <View style={styles.comments}>
          <Text style={styles.commentsTitle}>Comentarios</Text>
        </View>
        <View style={[styles.clanBadge, { backgroundColor: clanColor }]}>
          <Text style={styles.clanBadgeText}>{clanLabel}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  backRow: { marginBottom: 8 },
  back: { color: evoconnColors.neonGreen, fontSize: 16 },
  notFound: { color: evoconnColors.muted, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' },
  username: { color: evoconnColors.text, fontWeight: '700', fontSize: 16 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardContent: {
    borderLeftWidth: 4,
    paddingLeft: 14,
    paddingVertical: 14,
    backgroundColor: evoconnColors.card,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: { color: evoconnColors.text, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  body: { color: evoconnColors.text, fontSize: 15, lineHeight: 22 },
  voteRow: { marginBottom: 16 },
  comments: { marginTop: 8 },
  commentsTitle: { color: evoconnColors.text, fontWeight: '700', marginBottom: 12 },
  clanBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  clanBadgeText: { color: '#000', fontWeight: '800', fontSize: 12 },
});
