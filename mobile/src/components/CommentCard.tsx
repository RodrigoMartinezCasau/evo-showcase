import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Alert } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  COMMENT_CARD_LAYOUT as CARD,
  COMMENT_UPVOTE_LAYOUT as UP,
} from '@evoconn/constants/commentCardLayout';

import UpvoteInactive from '../assets/detailActions/31.svg';
import UpvoteActive from '../assets/detailActions/32.svg';

type CommentCardProps = {
  username: string;
  text: string;
  clanId: string | null | undefined;
  upvotes: number;
  isUpvoted?: boolean;
  onUpvote?: () => void;
  onReport?: () => void;
  onBlockUser?: () => void;
};

export function CommentCard({
  username,
  text,
  clanId,
  upvotes,
  isUpvoted = false,
  onUpvote,
  onReport,
  onBlockUser,
}: CommentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
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

  const handleLongPress = useCallback(() => {
    Alert.alert(`@${username}`, undefined, [
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
            `¿Bloquear a @${username}?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Bloquear',
                style: 'destructive',
                onPress: () => {
                  onBlockUser?.();
                  Alert.alert('Usuario bloqueado', `@${username} ha sido bloqueado.`);
                },
              },
            ],
          );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [username, onReport, onBlockUser]);

  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleUpvote();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [handleUpvote]);

  const iconSz = 24 * UP.scale;
  const upColor = isUpvoted ? UP.colorActive : UP.colorInactive;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleDoubleTap}
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
          @{username}
        </Text>
        <Text
          style={[styles.body, { fontSize: CARD.bodyFontSize }]}
          numberOfLines={expanded ? undefined : CARD.maxLines}
          onTextLayout={(e) => {
            if (!expanded && e.nativeEvent.lines.length > CARD.maxLines) {
              setNeedsTruncation(true);
            }
          }}
        >
          {text}
        </Text>
        {needsTruncation && (
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.6}
          >
            <Text style={styles.readMore}>
              {expanded ? 'Leer menos' : 'Leer más'}
            </Text>
          </TouchableOpacity>
        )}
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
}

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
  readMore: {
    color: evoconnColors.neonGreen,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
