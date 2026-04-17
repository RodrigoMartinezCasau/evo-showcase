import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
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

const STAR_SZ = STAR.size * STAR.scale;
const HEADER_H = STAR_SZ;

const starBoxStyle = {
  position: 'absolute' as const,
  left: STAR.offsetX,
  top: STAR.offsetY,
  width: STAR_SZ,
  height: STAR_SZ,
};

const titleBoxStyle = {
  position: 'absolute' as const,
  left: STAR_SZ + STAR.marginRight + DT.offsetX,
  top: 0,
  bottom: 0,
  justifyContent: 'center' as const,
};

const titleTextStyle = {
  fontWeight: '800' as const,
  letterSpacing: HDR.letterSpacing,
  textTransform: 'uppercase' as const,
  color: HDR.titleColor,
  fontSize: DT.fontSize,
  ...(DT.lineHeight > 0 ? { lineHeight: DT.lineHeight } : {}),
  marginTop: DT.offsetY,
};

const questionTextStyle = {
  fontSize: QT.fontSize,
  color: QT.color,
  ...(QT.lineHeight > 0 ? { lineHeight: QT.lineHeight } : {}),
  fontStyle: 'italic' as const,
  marginLeft: QT.offsetX,
  marginTop: QT.offsetY,
};

type Props = {
  question: string;
  unifiedHeight?: number;
  onMeasure?: (h: number) => void;
};

export const QuestionCard = React.memo(function QuestionCard({
  question,
  unifiedHeight,
  onMeasure,
}: Props) {
  const handleLayout = onMeasure
    ? (e: LayoutChangeEvent) => onMeasure(e.nativeEvent.layout.height)
    : undefined;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.outerCard,
        {
          minHeight: unifiedHeight ?? SB.baseMinHeight,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={starBoxStyle}>
          <WhiteStar width={STAR_SZ} height={STAR_SZ} />
        </View>
        <View style={titleBoxStyle}>
          <Text style={titleTextStyle}>PREGUNTA REFLEXIVA</Text>
        </View>
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
            marginLeft: IC.offsetX,
            marginTop: IC.offsetY,
          },
          IC.widthScale < 1
            ? { alignSelf: 'center' as const, width: `${IC.widthScale * 100}%` as unknown as number }
            : undefined,
        ]}
      >
        <Text style={questionTextStyle}>{question}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerCard: {
    // No border, no background — flows on the black screen background
  },
  header: {
    height: HEADER_H,
    marginBottom: SB.headerMarginBottom,
  },
  innerCard: {
    justifyContent: 'center',
  },
});
