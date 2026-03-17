import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getClanCardColor } from '@evoconn/theme/theme';
import { evoconnColors } from '@evoconn/theme/colors';
import { getPostById } from '@evoconn/data/mockCommunity';
import { mockComments } from '@evoconn/data/mockComments';
import {
  FeedbackWidget,
  VoteWidget,
  ClanBanner,
  CommentItem,
  RankBadge,
} from '@evoconn/components';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const post = id ? getPostById(id) : undefined;

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
          <TouchableOpacity onPress={() => router.push({ pathname: '/profile/[id]', params: { id: post.author.id } })}>
            <Text style={styles.username}>{post.author.username}</Text>
          </TouchableOpacity>
          <View style={styles.badges}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/clan/[id]', params: { id: post.author.clanId } })}>
              <ClanBanner clanId={post.author.clanId} shortLabel={post.author.clanId.toUpperCase()} />
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
          <VoteWidget stats={post.voteStats} />
        </View>
        <View style={styles.comments}>
          <Text style={styles.commentsTitle}>Comentarios</Text>
          {mockComments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onAuthorPress={() => router.push({ pathname: '/profile/[id]', params: { id: c.author.id } })}
            />
          ))}
        </View>
        <View style={[styles.clanBadge, { backgroundColor: clanColor }]}>
          <Text style={styles.clanBadgeText}>{post.author.clanId.toUpperCase()}</Text>
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
  title: { color: evoconnColors.text, fontWeight: '700', fontSize: 18, marginBottom: 8 },
  body: { color: evoconnColors.text, fontSize: 15, lineHeight: 22 },
  voteRow: { marginBottom: 24 },
  comments: { marginBottom: 24 },
  commentsTitle: { color: evoconnColors.muted, fontSize: 14, marginBottom: 12 },
  clanBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clanBadgeText: { color: evoconnColors.background, fontWeight: '700', fontSize: 12 },
});
