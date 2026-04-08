import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
const UL = SB.unlockedLabel;
const WB = SB.widgetButtonText;

type Props = {
  quote: string;
  author?: string;
  work?: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  innerBorderColor?: string;
  onAddWidget?: () => void;
};

export const DebateQuoteCard = React.memo(function DebateQuoteCard({
  quote,
  author,
  work,
  borderColor,
  borderWidth,
  backgroundColor,
  innerBorderColor,
  onAddWidget,
}: Props) {
  const attribution = [author, work].filter(Boolean).join(' — ');
  const starSz = STAR.size * STAR.scale;
  const accentColor = innerBorderColor || IC.accentColorFallback;

  return (
    <View
      style={[
        styles.outerCard,
        {
          borderColor,
          borderWidth,
          backgroundColor,
          height: SB.heights.quote,
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
          CITA TEXTUAL
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
            borderLeftColor: accentColor,
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
            fontSize: QTxt.fontSize,
            color: QTxt.color,
            ...(QTxt.lineHeight > 0 ? { lineHeight: QTxt.lineHeight } : {}),
            fontStyle: 'italic',
            transform: [
              { translateX: QTxt.offsetX },
              { translateY: QTxt.offsetY },
            ],
          }}
          numberOfLines={1}
        >
          "{quote}"
        </Text>

        {attribution ? (
          <Text
            style={{
              fontSize: QAut.fontSize,
              color: QAut.color,
              ...(QAut.lineHeight > 0 ? { lineHeight: QAut.lineHeight } : {}),
              marginTop: 2,
              transform: [
                { translateX: QAut.offsetX },
                { translateY: QAut.offsetY },
              ],
            }}
            numberOfLines={1}
          >
            — {attribution}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text
            style={[
              styles.badge,
              {
                fontSize: UL.fontSize,
                color: UL.color,
                ...(UL.lineHeight > 0 ? { lineHeight: UL.lineHeight } : {}),
                transform: [
                  { translateX: UL.offsetX },
                  { translateY: UL.offsetY },
                ],
              },
            ]}
          >
            ¡NUEVA FRASE DESBLOQUEADA!
          </Text>
          <TouchableOpacity
            style={[
              styles.widgetBtn,
              {
                borderColor: SB.widgetButtonBorder,
                borderRadius: SB.widgetButtonBorderRadius,
                paddingHorizontal: SB.widgetButtonPaddingH,
                paddingVertical: SB.widgetButtonPaddingV,
              },
            ]}
            onPress={onAddWidget}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.widgetBtnText,
                {
                  fontSize: WB.fontSize,
                  color: WB.color,
                  ...(WB.lineHeight > 0 ? { lineHeight: WB.lineHeight } : {}),
                  transform: [
                    { translateX: WB.offsetX },
                    { translateY: WB.offsetY },
                  ],
                },
              ]}
            >
              AÑADIR COMO WIDGET
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  footer: {
    marginTop: 4,
    alignItems: 'center',
  },
  badge: {
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  widgetBtn: {
    borderWidth: 1,
  },
  widgetBtnText: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
