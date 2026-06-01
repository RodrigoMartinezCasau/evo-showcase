import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from '../ClanCardFeedRimOverlay';
import { PostViewCountBadge } from '../PostViewCountBadge';
import { getClanColor } from '@evoconn/constants/clanColors';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';

type Props = {
  post: CommunityPost;
  cardWidth: number;
  onPress: (post: CommunityPost) => void;
  /** Nº de visualizaciones únicas (esquina superior izquierda, gris). */
  viewCount?: number;
};

/** Outer rounded-square radius — kept identical to the previous preview card. */
const CARD_RADIUS = 14;
/** Glowing-rim arm length (pt). Shorter than the full feed cards (52) to fit the smaller square. */
const RIM_ARM = 44;
/**
 * Inset the glowing rim a couple px inside the card edge so its visible (bloomed)
 * boundary lines up with the solid left edge of the surrounding panels/bars,
 * instead of bleeding flush to the very edge and reading as shifted-left.
 */
const RIM_INSET = 2;

export const RecentPostCard = React.memo(function RecentPostCard({ post, cardWidth, onPress, viewCount }: Props) {
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
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: RIM_INSET, left: RIM_INSET, right: RIM_INSET, bottom: RIM_INSET }}
        >
          <ClanCardFeedRimOverlay
            width={dims.width - RIM_INSET * 2}
            height={dims.height - RIM_INSET * 2}
            borderRadius={CARD_RADIUS - RIM_INSET}
            clanColor={clanColor}
            rimArm={RIM_ARM}
          />
        </View>
      ) : null}

      {/* Contenido: texto centrado dentro de un recuadro con la MISMA zona segura
          arriba y abajo (libra el contador y los tres puntos). El texto se
          autoajusta para caber siempre encapsulado. */}
      <View style={styles.content}>
        <Text
          style={isPhrase ? styles.phraseBody : styles.reflectionTitle}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {mainText}
        </Text>
      </View>

      {/* Recuento de visualizaciones (gris, arriba a la izquierda). */}
      {viewCount != null ? <PostViewCountBadge count={viewCount} /> : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    marginRight: 12,
    minHeight: 136,
    overflow: 'hidden',
    backgroundColor: PANEL_STAR_SURFACE_DEFAULT,
  },
  content: {
    flex: 1,
    minHeight: 136,
    // Misma zona segura arriba y abajo (34px): arriba libra el contador / los
    // tres puntos; abajo se replica para que la frase quede centrada y
    // encapsulada. Bordes laterales reducidos para dar más ancho al texto.
    paddingHorizontal: 22,
    paddingVertical: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflectionTitle: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  phraseBody: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
