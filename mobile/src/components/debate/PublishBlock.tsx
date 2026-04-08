import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
} from '@evoconn/constants/debateResponseLayout';

const PT = SB.publishTitle;
const PI = SB.publishInput;

type Props = {
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  onTitleChange?: (title: string) => void;
};

export const PublishBlock = React.memo(function PublishBlock({
  borderColor,
  borderWidth,
  backgroundColor,
  onTitleChange,
}: Props) {
  const [title, setTitle] = useState('');

  const handleChange = (t: string) => {
    setTitle(t);
    onTitleChange?.(t);
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderColor,
          borderWidth,
          backgroundColor,
          height: SB.heights.publish,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            fontSize: PT.fontSize,
            color: PT.color,
            ...(PT.lineHeight > 0 ? { lineHeight: PT.lineHeight } : {}),
            marginBottom: SB.publishTitleMarginBottom,
            transform: [
              { translateX: PT.offsetX },
              { translateY: PT.offsetY },
            ],
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
            transform: [
              { translateX: PI.offsetX },
              { translateY: PI.offsetY },
            ],
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
    overflow: 'hidden',
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
