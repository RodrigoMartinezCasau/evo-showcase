import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Comment } from '@evoconn/types';
import { CommentCard } from './CommentCard';

const THREAD_REPLIES_PAGE_SIZE = 5;

export type CommentThreadBlockProps = {
  root: Comment;
  descendants: Comment[];
  commentById: Map<string, Comment>;
  expanded: boolean;
  visibleReplyCount: number;
  isUpvotedRoot: boolean;
  isUpvoted: (commentId: string) => boolean;
  highlightedId: string | null;
  isPostAuthor: boolean;
  isAdmin: boolean;
  myId: string;
  /** Solo true al navegar a un comentario concreto (evita onLayout en cada scroll). */
  trackOffsets: boolean;
  withThreadControls: boolean;
  onRegisterOffset: (commentId: string, y: number) => void;
  onUpvote: (commentId: string, authorId: string) => void;
  onReply: (commentId: string, username: string) => void;
  onDelete: (commentId: string, viaAdmin: boolean) => void;
  onAuthorPress: (userId: string) => void;
  onBlockUser: (userId: string) => void;
  onToggleThread: (rootId: string) => void;
  onLoadMoreReplies: (rootId: string) => void;
  onCollapseThread: (rootId: string) => void;
};

export const CommentThreadBlock = React.memo(function CommentThreadBlock({
  root: c,
  descendants,
  commentById,
  expanded,
  visibleReplyCount,
  isUpvotedRoot,
  isUpvoted,
  highlightedId,
  isPostAuthor,
  isAdmin,
  myId,
  trackOffsets,
  withThreadControls,
  onRegisterOffset,
  onUpvote,
  onReply,
  onDelete,
  onAuthorPress,
  onBlockUser,
  onToggleThread,
  onLoadMoreReplies,
  onCollapseThread,
}: CommentThreadBlockProps) {
  const isOwnerDelete = isPostAuthor || c.author.id === myId;
  const canDelete = isOwnerDelete || isAdmin;

  const layoutProps = (commentId: string) =>
    trackOffsets
      ? {
          onLayout: (e: { nativeEvent: { layout: { y: number } } }) =>
            onRegisterOffset(commentId, e.nativeEvent.layout.y),
        }
      : {};

  const visibleDescendants = expanded ? descendants.slice(0, visibleReplyCount) : [];
  const remaining = descendants.length - visibleDescendants.length;
  const nextBatch = Math.min(THREAD_REPLIES_PAGE_SIZE, remaining);

  return (
    <View style={styles.block}>
      <View {...layoutProps(c.id)}>
        <CommentCard
          authorId={c.author.id}
          username={c.author.username}
          avatarUri={c.author.avatarUri}
          text={c.body}
          clanId={c.author.clanId}
          upvotes={c.upCount}
          isUpvoted={isUpvotedRoot}
          createdAt={c.createdAt}
          highlighted={highlightedId === c.id}
          onUpvote={() => onUpvote(c.id, c.author.id)}
          onReport={() => {}}
          onBlockUser={() => onBlockUser(c.author.id)}
          onAuthorPress={() => onAuthorPress(c.author.id)}
          onReply={() => onReply(c.id, c.author.username)}
          onDelete={canDelete ? () => onDelete(c.id, !isOwnerDelete) : undefined}
          replyCount={descendants.length}
          threadExpanded={expanded}
          onToggleThread={
            withThreadControls && descendants.length > 0
              ? () => onToggleThread(c.id)
              : undefined
          }
        />
      </View>
      {expanded ? (
        <>
          {visibleDescendants.map((child) => {
            const childIsOwnerDelete = isPostAuthor || child.author.id === myId;
            const childCanDelete = childIsOwnerDelete || isAdmin;
            const parent = child.parentId ? commentById.get(child.parentId) : undefined;
            const replyingToUsername =
              parent && parent.id !== c.id ? parent.author.username : undefined;
            return (
              <View key={child.id} {...layoutProps(child.id)}>
                <CommentCard
                  authorId={child.author.id}
                  username={child.author.username}
                  avatarUri={child.author.avatarUri}
                  text={child.body}
                  clanId={child.author.clanId}
                  upvotes={child.upCount}
                  isUpvoted={isUpvoted(child.id)}
                  createdAt={child.createdAt}
                  indented
                  highlighted={highlightedId === child.id}
                  replyingToUsername={replyingToUsername}
                  onUpvote={() => onUpvote(child.id, child.author.id)}
                  onReport={() => {}}
                  onBlockUser={() => onBlockUser(child.author.id)}
                  onAuthorPress={() => onAuthorPress(child.author.id)}
                  onReply={() => onReply(child.id, child.author.username)}
                  onDelete={
                    childCanDelete
                      ? () => onDelete(child.id, !childIsOwnerDelete)
                      : undefined
                  }
                />
              </View>
            );
          })}
          {remaining > 0 ? (
            <Pressable
              onPress={() => onLoadMoreReplies(c.id)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.threadMoreRepliesRow,
                pressed && styles.threadMoreRepliesPressed,
              ]}
            >
              <Text style={styles.threadMoreRepliesText}>
                — Ver {nextBatch} {nextBatch === 1 ? 'respuesta más' : 'respuestas más'}
              </Text>
            </Pressable>
          ) : descendants.length > 0 ? (
            <Pressable
              onPress={() => onCollapseThread(c.id)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.threadMoreRepliesRow,
                pressed && styles.threadMoreRepliesPressed,
              ]}
            >
              <Text style={styles.threadMoreRepliesText}>— Ver menos</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    width: '100%',
  },
  threadMoreRepliesRow: {
    paddingLeft: 20,
    paddingTop: 2,
    paddingBottom: 8,
  },
  threadMoreRepliesPressed: {
    opacity: 0.45,
  },
  threadMoreRepliesText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
});
