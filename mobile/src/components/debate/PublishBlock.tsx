import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import {
  AI_RESPONSE_LAYOUT as L,
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
} from '@evoconn/constants/debateResponseLayout';

const PT = SB.publishTitle;
const PI = SB.publishInput;
const STAR = L.stars.publish;
const STAR_SZ = STAR.size * STAR.scale;

type Props = {
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  starIcon?: FC<SvgProps>;
  unifiedHeight?: number;
  onMeasure?: (h: number) => void;
  onTitleChange?: (title: string) => void;
};

export const PublishBlock = React.memo(function PublishBlock({
  borderColor,
  borderWidth,
  backgroundColor,
  starIcon: StarIcon,
  unifiedHeight,
  onMeasure,
  onTitleChange,
}: Props) {
  const [title, setTitle] = useState('');

  const handleChange = (t: string) => {
    setTitle(t);
    onTitleChange?.(t);
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
          borderColor,
          borderWidth,
          backgroundColor,
          minHeight: unifiedHeight ?? SB.baseMinHeight,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      {StarIcon ? (
        <View style={styles.starBox}>
          <StarIcon width={STAR_SZ} height={STAR_SZ} />
        </View>
      ) : null}
      <Text
        style={[
          styles.title,
          {
            fontSize: PT.fontSize,
            color: PT.color,
            ...(PT.lineHeight > 0 ? { lineHeight: PT.lineHeight } : {}),
            marginBottom: SB.publishTitleMarginBottom,
            marginLeft: PT.offsetX,
            marginTop: PT.offsetY,
          },
        ]}
      >
        ¡PUBLICAR!
      </Text>
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
        placeholder="AÑADE UN TITULO INTERESANTE..."
        placeholderTextColor={SB.publishInputPlaceholderColor}
        maxLength={120}
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
  title: {
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
  },
});
