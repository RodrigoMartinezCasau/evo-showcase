import React, { useState } from 'react';
import { View, TextInput, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import {
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
} from '@evoconn/constants/debateResponseLayout';
import { PublishActionBar } from './PublishActionBar';

const PI = SB.publishInput;
const PUBLISH_TITLE_MAX_LEN = 21;

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
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
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
  input: {
    width: '100%',
  },
});
