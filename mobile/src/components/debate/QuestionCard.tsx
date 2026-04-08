import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AI_RESPONSE_LAYOUT as L,
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
} from '@evoconn/constants/debateResponseLayout';
import WhiteStar from '../../assets/debate/whiteStar.svg';

const STAR = L.stars.question;
const DT = L.displayTitles.question;
const IC = SB.questionCard;
const QT = SB.questionText;

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
    <View
      style={[
        styles.outerCard,
        {
          borderColor,
          borderWidth,
          backgroundColor,
          height: SB.heights.question,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      <View style={[styles.header, { marginBottom: SB.headerMarginBottom }]}>
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

      <View
        style={[
          styles.innerCard,
          {
            borderRadius: IC.borderRadius,
            paddingHorizontal: IC.paddingHorizontal,
            paddingVertical: IC.paddingVertical,
            backgroundColor: IC.backgroundColor,
            borderLeftWidth: IC.accentWidth,
            borderLeftColor: IC.accentColor,
            transform: [
              { translateX: IC.offsetX },
              { translateY: IC.offsetY },
            ],
          },
          IC.widthScale < 1
            ? { alignSelf: 'center' as const, width: `${IC.widthScale * 100}%` as unknown as number }
            : undefined,
        ]}
      >
        <Text
          style={{
            fontSize: QT.fontSize,
            color: QT.color,
            ...(QT.lineHeight > 0 ? { lineHeight: QT.lineHeight } : {}),
            fontStyle: 'italic',
            transform: [
              { translateX: QT.offsetX },
              { translateY: QT.offsetY },
            ],
          }}
          numberOfLines={3}
        >
          {question}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerCard: {
    borderRadius: CARD.borderRadius,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLabel: {
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'uppercase',
    color: HDR.titleColor,
  },
  innerCard: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
