import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AI_RESPONSE_LAYOUT as L,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
  DEBATE_QUESTION_LAYOUT as Q,
} from '@evoconn/constants/debateResponseLayout';
import WhiteStar from '../../assets/debate/whiteStar.svg';

const STAR = L.stars.question;
const DT = L.displayTitles.question;

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
  const starSz = STAR.size * STAR.scale;

  return (
    <View style={[styles.card, { borderColor, borderWidth, backgroundColor }]}>
      <View style={styles.header}>
        <View
          style={{
            width: starSz,
            height: starSz,
            marginRight: STAR.marginRight,
            transform: [
              { translateX: STAR.offsetX },
              { translateY: STAR.offsetY },
            ],
          }}
        >
          <WhiteStar width={starSz} height={starSz} />
        </View>
        <Text
          style={[
            styles.headerLabel,
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
          PREGUNTA REFLEXIVA
        </Text>
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
  headerLabel: {
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
