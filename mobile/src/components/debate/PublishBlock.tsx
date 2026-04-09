import React, { useState, useMemo } from 'react';
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
const OW = PT.outlineWidth;

const OUTLINE_OFFSETS: [number, number][] = [
  [-OW, -OW], [-OW, 0], [-OW, OW],
  [0, -OW],              [0, OW],
  [OW, -OW],  [OW, 0],  [OW, OW],
];

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
}: Props) {
  const [title, setTitle] = useState('');

  const handleChange = (t: string) => {
    setTitle(t);
    onTitleChange?.(t);
  };

  const handleLayout = onMeasure
    ? (e: LayoutChangeEvent) => onMeasure(e.nativeEvent.layout.height)
    : undefined;

  const outlineElements = useMemo(() => {
    if (!titleOutlineColor || OW <= 0) return null;
    return OUTLINE_OFFSETS.map(([dx, dy], i) => (
      <Text
        key={i}
        style={[
          titleBaseStyle,
          styles.outlineCopy,
          { color: titleOutlineColor, left: dx, top: dy },
        ]}
      >
        ¡PUBLICAR!
      </Text>
    ));
  }, [titleOutlineColor]);

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

      <View style={[styles.titleContainer, { marginBottom: SB.publishTitleMarginBottom, marginLeft: PT.offsetX, marginTop: PT.offsetY }]}>
        {outlineElements}
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
        placeholder="AÑADE UN TITULO INTERESANTE..."
        placeholderTextColor={SB.publishInputPlaceholderColor}
        maxLength={120}
      />

      <PublishActionBar
        barColor={actionBarColor ?? borderColor}
        onPublish={onPublish}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineCopy: {
    position: 'absolute',
  },
  input: {
    width: '100%',
  },
});
