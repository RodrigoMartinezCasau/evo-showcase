import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import {
  AI_RESPONSE_LAYOUT as L,
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
} from '@evoconn/constants/debateResponseLayout';
import { PublishActionBar } from './PublishActionBar';

const PT = SB.publishTitle;
const PI = SB.publishInput;
const STAR = L.stars.publish;
const STAR_SZ = STAR.size * STAR.scale;
const PUBLISH_TITLE_MAX_LEN = 21;

const titleBaseStyle = {
  fontWeight: '800' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  fontSize: PT.fontSize,
  ...(PT.lineHeight > 0 ? { lineHeight: PT.lineHeight } : {}),
  transform: [{ scale: PT.scale }],
};

type Props = {
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  starIcon?: FC<SvgProps>;
  titleOutlineColor?: string;
  actionBarColor?: string;
  unifiedHeight?: number;
  onMeasure?: (h: number) => void;
  onTitleChange?: (title: string) => void;
  onPublish?: () => Promise<void> | void;
  /** Por defecto título de reflexión; en frases = autor citado. */
  inputPlaceholder?: string;
  inputMaxLength?: number;
  /** Frase ya publicada: input solo lectura y barra en ✓ PUBLICADO. */
  published?: boolean;
  /** Valor inicial del autor cuando `published` (reapertura de hilo). */
  initialAuthorValue?: string;
};

export const PublishBlock = React.memo(function PublishBlock({
  borderColor,
  borderWidth,
  backgroundColor,
  starIcon: StarIcon,
  titleOutlineColor,
  actionBarColor,
  unifiedHeight,
  onMeasure,
  onTitleChange,
  onPublish,
  inputPlaceholder = 'AÑADE UN TITULO INTERESANTE...',
  inputMaxLength = PUBLISH_TITLE_MAX_LEN,
  published = false,
  initialAuthorValue = '',
}: Props) {
  const [title, setTitle] = useState(() =>
    published && initialAuthorValue ? initialAuthorValue : '',
  );

  const handleChange = (t: string) => {
    if (published) return;
    const next = t.slice(0, inputMaxLength);
    setTitle(next);
    onTitleChange?.(next);
  };

  const handleLayout = onMeasure
    ? (e: LayoutChangeEvent) => onMeasure(e.nativeEvent.layout.height)
    : undefined;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.card,
        {
          borderLeftColor: borderColor,
          borderLeftWidth: borderWidth,
          backgroundColor,
          minHeight: unifiedHeight ?? SB.baseMinHeight,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      <View style={[styles.titleContainer, { marginBottom: SB.publishTitleMarginBottom, marginTop: PT.offsetY }]}>
        <Text style={[titleBaseStyle, { color: PT.color }]}>
          ¡PUBLICAR!
        </Text>
      </View>

      <TextInput
        style={[
          styles.input,
          {
            fontSize: PI.fontSize,
            color: PI.color,
            ...(PI.lineHeight > 0 ? { lineHeight: PI.lineHeight } : {}),
            backgroundColor: SB.publishInputBackground,
            borderRadius: SB.publishInputBorderRadius,
            paddingHorizontal: SB.publishInputPaddingH,
            paddingVertical: SB.publishInputPaddingV,
            marginLeft: PI.offsetX,
            marginTop: PI.offsetY,
          },
        ]}
        value={title}
        onChangeText={handleChange}
        placeholder={inputPlaceholder}
        placeholderTextColor={SB.publishInputPlaceholderColor}
        maxLength={inputMaxLength}
        editable={!published}
      />

      <PublishActionBar
        barColor={actionBarColor ?? borderColor}
        disabled={published || !onPublish || title.trim().length === 0}
        onPublish={published ? undefined : onPublish}
        externallyPublished={published}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBox: {
    position: 'absolute',
    left: SB.outerPaddingH + STAR.offsetX,
    top: SB.outerPaddingV + STAR.offsetY,
    width: STAR_SZ,
    height: STAR_SZ,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
  },
});
