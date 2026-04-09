import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  AI_RESPONSE_LAYOUT as L,
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
} from '@evoconn/constants/debateResponseLayout';
import WhiteStar from '../../assets/debate/whiteStar.svg';

const STAR = L.stars.quote;
const DT = L.displayTitles.quote;
const IC = SB.quoteCard;
const QTxt = SB.quoteText;
const QAut = SB.quoteAuthor;

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

const quoteTextBaseStyle = {
  fontSize: QTxt.fontSize,
  color: QTxt.color,
  ...(QTxt.lineHeight > 0 ? { lineHeight: QTxt.lineHeight } : {}),
  fontStyle: 'italic' as const,
  marginLeft: QTxt.offsetX,
  marginTop: QTxt.offsetY,
};

const authorBaseStyle = {
  fontSize: QAut.fontSize,
  color: QAut.color,
  ...(QAut.lineHeight > 0 ? { lineHeight: QAut.lineHeight } : {}),
  marginTop: 4 + QAut.offsetY,
  marginLeft: QAut.offsetX,
};

type Props = {
  quote: string;
  author?: string;
  work?: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  innerBorderColor?: string;
  unifiedHeight?: number;
  onMeasure?: (h: number) => void;
};

export const DebateQuoteCard = React.memo(function DebateQuoteCard({
  quote,
  author,
  work,
  borderColor,
  borderWidth,
  backgroundColor,
  innerBorderColor,
  unifiedHeight,
  onMeasure,
}: Props) {
  const attribution = [author, work].filter(Boolean).join(' — ');
  const accentColor = innerBorderColor || IC.accentColorFallback;

  const handleLayout = onMeasure
    ? (e: LayoutChangeEvent) => onMeasure(e.nativeEvent.layout.height)
    : undefined;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.outerCard,
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
      <View style={styles.header}>
        <View style={starBoxStyle}>
          <WhiteStar width={STAR_SZ} height={STAR_SZ} />
        </View>
        <View style={titleBoxStyle}>
          <Text style={titleTextStyle}>CITA TEXTUAL</Text>
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
            borderLeftColor: accentColor,
            marginLeft: IC.offsetX,
            marginTop: IC.offsetY,
          },
          IC.widthScale < 1
            ? { alignSelf: 'center' as const, width: `${IC.widthScale * 100}%` as unknown as number }
            : undefined,
        ]}
      >
        <Text style={quoteTextBaseStyle}>"{quote}"</Text>

        {attribution ? (
          <Text style={authorBaseStyle}>— {attribution}</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerCard: {
    borderRadius: CARD.borderRadius,
  },
  header: {
    height: HEADER_H,
    marginBottom: SB.headerMarginBottom,
  },
  innerCard: {
    justifyContent: 'center',
  },
});
