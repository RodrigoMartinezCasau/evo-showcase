import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Alert } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  COMMENT_CARD_LAYOUT as CARD,
  COMMENT_UPVOTE_LAYOUT as UP,
  COMMENT_EXPANSION_CONFIG as EXP,
} from '@evoconn/constants/commentCardLayout';
import { useFollowState } from '@evoconn/hooks/useFollowState';

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
}: CommentCardProps) {
  const [charLimit, setCharLimit] = useState(EXP.initialLimit);
  const isLong = text.length > EXP.initialLimit;
  const isFullyExpanded = charLimit >= Math.min(text.length, EXP.maxLimit);
  const visibleText = isLong && !isFullyExpanded
    ? text.slice(0, charLimit) + '…'
    : text.slice(0, Math.min(text.length, EXP.maxLimit));
  const clanColor = getClanColor(clanId);

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
    Alert.alert(displayUsername, undefined, [
      {
        text: following ? 'Dejar de seguir' : 'Seguir usuario',
        onPress: () => {
          toggleFollow(authorId);
        },
      },
      {
        text: 'Denunciar comentario',
        onPress: () => {
          onReport?.();
          Alert.alert('Comentario denunciado', 'Gracias por tu reporte.');
        },
      },
      {
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
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [displayUsername, username, authorId, onReport, onBlockUser, checkFollowing, toggleFollow]);

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

  const iconSz = 24 * UP.scale;
  const upColor = isUpvoted ? UP.colorActive : UP.colorInactive;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={2000}
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
        <Text style={[styles.username, { fontSize: CARD.usernameFontSize }]}>
          {displayUsername}
        </Text>
        <Text style={[styles.body, { fontSize: CARD.bodyFontSize }]}>
          {visibleText}
        </Text>
      </TouchableOpacity>

      {/* Upvote button — anchored to card, centered vertically */}
      <View
        style={[
          styles.upvoteAnchor,
          {
            transform: [
              { translateX: UP.offsetX },
              { translateY: UP.offsetY },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={handleUpvote} activeOpacity={0.7}>
          <Animated.View
            style={{
              alignItems: 'center',
              transform: [{ scale: bounceScale }],
            }}
          >
            {isUpvoted ? (
              <UpvoteActive key="c-up-a" width={iconSz} height={iconSz} />
            ) : (
              <UpvoteInactive key="c-up-i" width={iconSz} height={iconSz} />
            )}
            <Text style={[styles.upCount, { color: upColor, fontSize: UP.countFontSize }]}>
              {upvotes}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CARD.gapBetweenComments,
  },
  card: {
    flex: 1,
    marginRight: 28,
  },
  username: {
    color: evoconnColors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    color: '#CCCCCC',
    lineHeight: 18,
  },
  upvoteAnchor: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  upCount: {
    fontWeight: '700',
    marginTop: 2,
  },
});
