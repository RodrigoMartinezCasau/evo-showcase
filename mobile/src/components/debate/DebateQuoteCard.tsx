import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  AI_RESPONSE_LAYOUT as L,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
  DEBATE_QUOTE_LAYOUT as QT,
} from '@evoconn/constants/debateResponseLayout';
import WhiteStar from '../../assets/debate/whiteStar.svg';

const STAR = L.stars.quote;
const DT = L.displayTitles.quote;

type Props = {
  quote: string;
  author?: string;
  work?: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  onAddWidget?: () => void;
};

export const DebateQuoteCard = React.memo(function DebateQuoteCard({
  quote,
  author,
  work,
  borderColor,
  borderWidth,
  backgroundColor,
  onAddWidget,
}: Props) {
  const attribution = [author, work].filter(Boolean).join(' — ');
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
          CITA TEXTUAL
        </Text>
      </View>

      <View style={styles.quoteRow}>
        <View style={styles.accentBar} />
        <View style={styles.quoteContent}>
          <Text style={styles.quoteText}>"{quote}"</Text>
          {attribution ? (
            <Text style={styles.attribution}>— {attribution}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.badge}>¡NUEVA FRASE DESBLOQUEADA!</Text>
        <TouchableOpacity
          style={styles.widgetBtn}
          onPress={onAddWidget}
          activeOpacity={0.7}
        >
          <Text style={styles.widgetBtnText}>AÑADIR COMO WIDGET</Text>
        </TouchableOpacity>
      </View>
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
  quoteRow: {
    flexDirection: 'row',
  },
  accentBar: {
    width: QT.accentWidth,
    backgroundColor: QT.accentColor,
    borderRadius: 2,
    marginRight: 12,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    color: QT.textColor,
    fontSize: QT.textSize,
    lineHeight: QT.textLineHeight,
    fontStyle: 'italic',
  },
  attribution: {
    color: '#808080',
    fontSize: 13,
    marginTop: 8,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  badge: {
    color: QT.badgeColor,
    fontSize: QT.badgeFontSize,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  widgetBtn: {
    borderWidth: 1,
    borderColor: QT.buttonBorderColor,
    borderRadius: QT.buttonBorderRadius,
    paddingHorizontal: QT.buttonPaddingH,
    paddingVertical: QT.buttonPaddingV,
  },
  widgetBtnText: {
    color: QT.buttonColor,
    fontSize: QT.buttonFontSize,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
