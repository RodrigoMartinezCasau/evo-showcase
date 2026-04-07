import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  AI_RESPONSE_LAYOUT as L,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_PUBLISH_LAYOUT as PUB,
  DEBATE_HEADER_LAYOUT as HDR,
} from '@evoconn/constants/debateResponseLayout';

const DT = L.displayTitles.publish;

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
    <View style={[styles.card, { borderColor, borderWidth, backgroundColor }]}>
      <Text
        style={[
          styles.title,
          {
            fontSize: DT.fontSize,
            ...(DT.lineHeight > 0 ? { lineHeight: DT.lineHeight } : {}),
            transform: [
              { translateX: DT.offsetX },
              { translateY: DT.offsetY },
            ],
          },
        ]}
      >
        ¡PUBLICAR!
      </Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={handleChange}
        placeholder="AÑADE UN TITULO INTERESANTE..."
        placeholderTextColor={PUB.inputPlaceholderColor}
        maxLength={120}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: PUB.borderRadius,
    paddingHorizontal: CARD.paddingHorizontal,
    paddingVertical: CARD.paddingVertical,
    alignItems: 'center',
  },
  title: {
    color: HDR.titleColor,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  input: {
    width: '100%',
    backgroundColor: PUB.inputBackgroundColor,
    borderRadius: PUB.inputBorderRadius,
    color: '#FFFFFF',
    fontSize: PUB.inputFontSize,
    paddingHorizontal: PUB.inputPaddingH,
    paddingVertical: PUB.inputPaddingV,
  },
});
