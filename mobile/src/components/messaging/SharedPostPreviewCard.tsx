import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { PostImageCover } from '@evoconn/components/publish/PostImageCover';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';

const CARD_RADIUS = 12;
export const SHARED_POST_PREVIEW_HEIGHT = 168;

type Props = {
  post: CommunityPost;
};

/** Miniatura de publicación compartida: foto de fondo + frase/título encima. */
export function SharedPostPreviewCard({ post }: Props) {
  const isPhrase = post.type === 'phrase';
  const mainText = isPhrase
    ? formatPhraseBodyForDisplay(post.body)
    : (post.title ?? post.body);
  const hasPhoto = !!post.imageUrl?.trim();

  return (
    <View style={styles.card}>
      {hasPhoto ? (
        <PostImageCover
          uri={post.imageUrl!}
          imageWidth={post.imageWidth}
          imageHeight={post.imageHeight}
          focusY={post.imageCropFocusY ?? post.imageCropFocusYFollowing ?? 0.5}
          imageBorderRadius={CARD_RADIUS}
          scrimOpacity={0.38}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.starWrap]}>
          <PanelStarField surfaceColor={PANEL_STAR_SURFACE_DEFAULT} />
        </View>
      )}

      <View style={styles.textLayer} pointerEvents="none">
        { !isPhrase && post.title ? (
          <Text style={styles.reflectionTitle} numberOfLines={2}>
            {post.title}
          </Text>
        ) : null}
        <Text
          style={isPhrase ? styles.phraseBody : styles.reflectionBody}
          numberOfLines={isPhrase ? 5 : 3}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
        >
          {isPhrase ? mainText : (post.body || mainText)}
        </Text>
        {isPhrase && post.quoteAuthor ? (
          <Text style={styles.quoteAuthor} numberOfLines={1}>
            {post.quoteAuthor}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: SHARED_POST_PREVIEW_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: PANEL_STAR_SURFACE_DEFAULT,
  },
  starWrap: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  textLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reflectionTitle: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reflectionBody: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  phraseBody: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  quoteAuthor: {
    marginTop: 8,
    width: '100%',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
