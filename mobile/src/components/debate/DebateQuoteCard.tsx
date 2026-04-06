import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
  DEBATE_QUOTE_LAYOUT as QT,
} from '@evoconn/constants/debateResponseLayout';

type Props = {
  quote: string;
  author?: string;
  work?: string;
  /** Called when user taps "AÑADIR COMO WIDGET". */
  onAddWidget?: () => void;
};

export const DebateQuoteCard = React.memo(function DebateQuoteCard({
  quote,
  author,
  work,
  onAddWidget,
}: Props) {
  const attribution = [author, work].filter(Boolean).join(' — ');

  return (
    <View style={[styles.card, { borderColor: QT.borderColor }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.star}>★</Text>
        <Text style={styles.headerLabel}>CITA TEXTUAL</Text>
      </View>

      {/* ── Quote with red left accent ── */}
      <View style={styles.quoteRow}>
        <View style={styles.accentBar} />
        <View style={styles.quoteContent}>
          <Text style={styles.quoteText}>"{quote}"</Text>
          {attribution ? (
            <Text style={styles.attribution}>— {attribution}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Unlocked badge + Widget button ── */}
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
    color: QT.accentColor,
  },
  headerLabel: {
    fontSize: HDR.labelSize,
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'uppercase',
    color: QT.accentColor,
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
