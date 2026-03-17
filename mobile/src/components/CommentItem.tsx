import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Comment } from '@evoconn/types';
import { getClanCardColor } from '@evoconn/theme/theme';
import { evoconnColors } from '@evoconn/theme/colors';

type CommentItemProps = {
  comment: Comment;
  onAuthorPress?: () => void;
  onUpvote?: () => void;
};

export function CommentItem({ comment, onAuthorPress, onUpvote }: CommentItemProps) {
  const clanColor = getClanCardColor(comment.author.clanId);

  return (
    <View style={[styles.wrapper, { borderLeftColor: clanColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onAuthorPress}>
          <Text style={styles.username}>{comment.author.username}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onUpvote} style={styles.upRow}>
          <Text style={styles.arrow}>▲</Text>
          <Text style={styles.count}>{comment.upCount}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>{comment.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 10,
    marginVertical: 6,
    backgroundColor: evoconnColors.card,
    borderRadius: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  username: { color: evoconnColors.text, fontWeight: '600', fontSize: 12 },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { color: evoconnColors.neonGreen, fontSize: 12 },
  count: { color: evoconnColors.muted, fontSize: 12 },
  body: { color: evoconnColors.muted, fontSize: 14, lineHeight: 20 },
});
