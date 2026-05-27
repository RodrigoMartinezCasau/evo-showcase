import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Alert } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  COMMENT_CARD_LAYOUT as CARD,
  COMMENT_UPVOTE_LAYOUT as UP,
  COMMENT_EXPANSION_CONFIG as EXP,
} from '@evoconn/constants/commentCardLayout';
import {
  NEW_COMMENT_BOX_LAYOUT as INBOX,
  NEW_COMMENT_SEND_BUTTON_LAYOUT as SEND_BTN,
} from '@evoconn/constants/newCommentBoxLayout';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { timeAgo } from '@evoconn/utils/timeAgo';

import UpvoteInactive from '../assets/detailActions/31.svg';
import UpvoteActive from '../assets/detailActions/32.svg';

type CommentCardProps = {
  authorId: string;
  username: string;
  text: string;
  clanId: string | null | undefined;
  upvotes: number;
  isUpvoted?: boolean;
  onUpvote?: () => void;
  onReport?: () => void;
  onBlockUser?: () => void;
  /** Called when the user taps the author's name — use for profile navigation. */
  onAuthorPress?: () => void;
  /** ISO timestamp para mostrar "hace 5 min". Si falta, no se muestra. */
  createdAt?: string;
  /** Si está definido, muestra opción "Responder" en long-press y la acción. */
  onReply?: () => void;
  /** Si está definido, muestra opción "Eliminar" en long-press. */
  onDelete?: () => void;
  /** Sangría aplicada cuando este comentario es una respuesta dentro de un hilo. */
  indented?: boolean;
  /** Si > 0, muestra el toggle "Ver N respuestas" al lado del botón Responder. */
  replyCount?: number;
  /** Estado del hilo asociado (solo aplica si replyCount > 0). */
  threadExpanded?: boolean;
  /** Callback para plegar/desplegar el hilo. */
  onToggleThread?: () => void;
  /**
   * Username del comentario al que se está respondiendo, sin "@".
   * Solo se muestra cuando es una respuesta a otra respuesta (no a la raíz).
   * Aparece como "→ @usuario" junto al tiempo en el header.
   */
  replyingToUsername?: string;
};

export const CommentCard = React.memo(function CommentCard({
  authorId,
  username,
  text,
  clanId,
  upvotes,
  isUpvoted = false,
  onUpvote,
  onReport,
  onBlockUser,
  onAuthorPress,
  createdAt,
  onReply,
  onDelete,
  indented = false,
  replyCount = 0,
  threadExpanded = false,
  onToggleThread,
  replyingToUsername,
}: CommentCardProps) {
  const [charLimit, setCharLimit] = useState<number>(EXP.initialLimit);
  const isLong = text.length > EXP.initialLimit;
  const isFullyExpanded = charLimit >= Math.min(text.length, EXP.maxLimit);
  const visibleText = isLong && !isFullyExpanded
    ? text.slice(0, charLimit) + '…'
    : text.slice(0, Math.min(text.length, EXP.maxLimit));
  const clanColor = getClanColor(clanId);
  const relTime = createdAt ? timeAgo(createdAt) : '';

  const bounceScale = useRef(new Animated.Value(1)).current;
  const handleUpvote = useCallback(() => {
    bounceScale.setValue(0.7);
    Animated.spring(bounceScale, {
      toValue: 1,
      friction: 4,
      tension: 300,
      useNativeDriver: true,
    }).start();
    onUpvote?.();
  }, [bounceScale, onUpvote]);

  const { isFollowing: checkFollowing, toggleFollow } = useFollowState();

  const displayUsername = username.startsWith('@') ? username : `@${username}`;

  const handleLongPress = useCallback(() => {
    const following = checkFollowing(authorId);
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [];

    if (onReply) {
      buttons.push({
        text: 'Responder',
        onPress: () => onReply(),
      });
    }

    buttons.push({
      text: following ? 'Dejar de seguir' : 'Seguir usuario',
      onPress: () => toggleFollow(authorId),
    });

    buttons.push({
      text: 'Denunciar comentario',
      onPress: () => {
        onReport?.();
        Alert.alert('Comentario denunciado', 'Gracias por tu reporte.');
      },
    });

    buttons.push({
      text: 'Bloquear usuario',
      style: 'destructive',
      onPress: () => {
        Alert.alert(
          'Bloquear usuario',
          `¿Bloquear a ${displayUsername}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Bloquear',
              style: 'destructive',
              onPress: () => {
                onBlockUser?.();
                Alert.alert('Usuario bloqueado', `${displayUsername} ha sido bloqueado.`);
              },
            },
          ],
        );
      },
    });

    if (onDelete) {
      buttons.push({
        text: 'Eliminar comentario',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Eliminar comentario',
            '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => onDelete() },
            ],
          );
        },
      });
    }

    buttons.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(displayUsername, undefined, buttons);
  }, [displayUsername, authorId, onReport, onBlockUser, checkFollowing, toggleFollow, onReply, onDelete]);

  const lastTap = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      lastTap.current = 0;
      handleUpvote();
    } else {
      lastTap.current = now;
      singleTapTimer.current = setTimeout(() => {
        if (isLong && !isFullyExpanded) {
          setCharLimit((prev) => Math.min(prev + EXP.step, EXP.maxLimit));
        }
      }, 300);
    }
  }, [handleUpvote, isLong, isFullyExpanded]);

  const iconSz = SEND_BTN.size * 0.6 * UP.scale;

  return (
    // Row mirrors NewCommentBox: card(flex:1) + gap(INBOX.gap) + upvote(SEND_BTN.size).
    // INBOX.gap and SEND_BTN.size are the single source of truth → X-axis alignment
    // with the send button is guaranteed on every device width.
    <View style={[styles.wrapper, indented && styles.wrapperIndented]}>
      {/* Card — flex:1, same width as the "Añadir comentario" pill */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[
          styles.card,
          {
            backgroundColor: CARD.backgroundColor,
            borderRadius: CARD.borderRadius,
            paddingHorizontal: CARD.paddingX,
            paddingVertical: CARD.paddingY,
            borderLeftWidth: CARD.clanAccentWidth,
            borderLeftColor: clanColor,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onAuthorPress} disabled={!onAuthorPress} hitSlop={8}>
            <Text style={[styles.username, { fontSize: CARD.usernameFontSize }]}>
              {displayUsername}
            </Text>
          </TouchableOpacity>
          {relTime ? (
            <Text style={[styles.timeText, { fontSize: Math.max(10, CARD.usernameFontSize - 2) }]}>
              · {relTime}
            </Text>
          ) : null}
          {replyingToUsername ? (
            <Text
              numberOfLines={1}
              style={[styles.replyTargetText, { fontSize: Math.max(10, CARD.usernameFontSize - 2) }]}
            >
              · → @{replyingToUsername.replace(/^@/, '').toUpperCase()}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.body, { fontSize: CARD.bodyFontSize }]}>
          {visibleText}
        </Text>
        {(onReply || (replyCount > 0 && onToggleThread)) ? (
          <View style={styles.actionRow}>
            {onReply ? (
              <TouchableOpacity onPress={onReply} hitSlop={8}>
                <Text style={styles.replyBtnText}>Responder</Text>
              </TouchableOpacity>
            ) : null}
            {replyCount > 0 && onToggleThread ? (
              <TouchableOpacity onPress={onToggleThread} hitSlop={8}>
                <Text style={styles.replyBtnText}>
                  {threadExpanded
                    ? '— Ocultar respuestas'
                    : `— Ver ${replyCount} ${replyCount === 1 ? 'respuesta' : 'respuestas'}`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Upvote — sibling of the card, width = SEND_BTN.size, gap = INBOX.gap.
          Aligns exactly with the send button column on every device. */}
      <TouchableOpacity
        onPress={handleUpvote}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={styles.upvoteAnchor}
      >
        <Animated.View
          style={{ alignItems: 'center', transform: [{ scale: bounceScale }] }}
        >
          {isUpvoted ? (
            <UpvoteActive key="c-up-a" width={iconSz} height={iconSz} />
          ) : (
            <UpvoteInactive key="c-up-i" width={iconSz} height={iconSz} />
          )}
          <Text style={[styles.upCount, { fontSize: UP.countFontSize }]}>{upvotes}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: INBOX.gap,
    marginBottom: CARD.gapBetweenComments,
  },
  wrapperIndented: {
    paddingLeft: 20,
  },
  card: {
    flex: 1,
  },
  upvoteAnchor: {
    width: SEND_BTN.size,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  username: {
    color: evoconnColors.text,
    fontWeight: '700',
  },
  timeText: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  replyTargetText: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    color: '#CCCCCC',
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  replyBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  upCount: {
    fontWeight: '700',
    marginTop: 2,
    color: '#FFFFFF',
  },
});
