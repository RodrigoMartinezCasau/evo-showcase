import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
  DEBATE_QUESTION_LAYOUT as Q,
} from '@evoconn/constants/debateResponseLayout';

type Props = {
  question: string;
  accentColor?: string;
};

export const QuestionCard = React.memo(function QuestionCard({
  question,
  accentColor,
}: Props) {
  const borderColor = accentColor ?? Q.borderColor;

  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.header}>
        <Text style={[styles.star, { color: borderColor }]}>★</Text>
        <Text style={[styles.headerLabel, { color: borderColor }]}>
          PREGUNTA REFLEXIVA
        </Text>
      </View>
      <Text style={styles.questionText}>{question}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD.backgroundColor,
    borderRadius: CARD.borderRadius,
    borderWidth: CARD.borderWidth,
    paddingHorizontal: CARD.paddingHorizontal,
    paddingVertical: CARD.paddingVertical,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HDR.marginBottom,
  },
  star: {
    fontSize: HDR.starSize,
    marginRight: 8,
  },
  headerLabel: {
    fontSize: HDR.labelSize,
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'uppercase',
  },
  questionText: {
    color: Q.textColor,
    fontSize: Q.textSize,
    lineHeight: Q.textLineHeight,
    fontStyle: 'italic',
  },
});
