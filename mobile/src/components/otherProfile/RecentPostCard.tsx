import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from '../ClanCardFeedRimOverlay';
import { getClanColor } from '@evoconn/constants/clanColors';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';

type Props = {
  post: CommunityPost;
  cardWidth: number;
  onPress: (post: CommunityPost) => void;
};

/** Outer rounded-square radius — kept identical to the previous preview card. */
const CARD_RADIUS = 14;
/** Glowing-rim arm length (pt). Shorter than the full feed cards (52) to fit the smaller square. */
const RIM_ARM = 44;

export const RecentPostCard = React.memo(function RecentPostCard({ post, cardWidth, onPress }: Props) {
  const isPhrase = post.type === 'phrase';
  // Frases → frase completa · Reflexiones → solo el título.
  const mainText = isPhrase
    ? formatPhraseBodyForDisplay(post.body)
    : (post.title ?? post.body);

  const clanColor = getClanColor(post.author.clanId);

  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims((prev) =>
      prev?.width === width && prev?.height === height ? prev : { width, height },
    );
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(post)}
      onLayout={onCardLayout}
      style={[styles.card, { width: cardWidth }]}
    >
      {/* Fondo de estrellas (mismo que las tarjetas de "Siguiendo"). */}
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        <PanelStarField surfaceColor={PANEL_STAR_SURFACE_DEFAULT} />
      </View>

      {/* Reborde con glow estilo Apple en color de clan (blanco en el centro). */}
      {dims ? (
        <ClanCardFeedRimOverlay
          width={dims.width}
          height={dims.height}
          borderRadius={CARD_RADIUS}
          clanColor={clanColor}
          rimArm={RIM_ARM}
        />
      ) : null}

      {/* Contenido: solo el texto, centrado. */}
      <View style={styles.content}>
        <Text
          style={isPhrase ? styles.phraseBody : styles.reflectionTitle}
          numberOfLines={isPhrase ? 5 : 4}
        >
          {mainText}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    marginRight: 12,
    minHeight: 170,
    overflow: 'hidden',
    backgroundColor: PANEL_STAR_SURFACE_DEFAULT,
  },
  content: {
    flex: 1,
    minHeight: 170,
    paddingHorizontal: 20,
    paddingVertical: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 22,
    textAlign: 'center',
  },
  phraseBody: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
});
