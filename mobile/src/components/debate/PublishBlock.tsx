import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_PUBLISH_LAYOUT as PUB,
} from '@evoconn/constants/debateResponseLayout';

type Props = {
  onTitleChange?: (title: string) => void;
};

export const PublishBlock = React.memo(function PublishBlock({ onTitleChange }: Props) {
  const [title, setTitle] = useState('');

  const handleChange = (t: string) => {
    setTitle(t);
    onTitleChange?.(t);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>¡PUBLICAR!</Text>
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
    backgroundColor: PUB.backgroundColor,
    borderRadius: PUB.borderRadius,
    paddingHorizontal: CARD.paddingHorizontal,
    paddingVertical: CARD.paddingVertical,
    alignItems: 'center',
  },
  title: {
    color: PUB.titleColor,
    fontSize: PUB.titleSize,
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
