import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
  DEBATE_QUESTION_LAYOUT as Q,
} from '@evoconn/constants/debateResponseLayout';

type Props = {
  question: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
};

export const QuestionCard = React.memo(function QuestionCard({
  question,
  borderColor,
  borderWidth,
  backgroundColor,
}: Props) {
  return (
    <View style={[styles.card, { borderColor, borderWidth, backgroundColor }]}>
      <View style={styles.header}>
        <Text style={styles.star}>★</Text>
        <Text style={styles.headerLabel}>PREGUNTA REFLEXIVA</Text>
      </View>
      <Text style={styles.questionText}>{question}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD.borderRadius,
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
    color: HDR.starColor,
  },
  headerLabel: {
    fontSize: HDR.labelSize,
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'uppercase',
    color: HDR.titleColor,
  },
  questionText: {
    color: Q.textColor,
    fontSize: Q.textSize,
    lineHeight: Q.textLineHeight,
    fontStyle: 'italic',
  },
});
