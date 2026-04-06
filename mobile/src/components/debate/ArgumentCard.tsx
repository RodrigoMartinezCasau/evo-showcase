import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
  DEBATE_POINT_LAYOUT as PT,
  DEBATE_SUMMARY_LAYOUT as SUM,
} from '@evoconn/constants/debateResponseLayout';

export type ArgumentPointData = {
  title: string;
  bullets: string[];
};

type Props = {
  /** Card header label (e.g. "TU POSTURA"). */
  title: string;
  /** Left border + header star color. */
  accentColor: string;
  points: ArgumentPointData[];
  summary?: string;
};

export const ArgumentCard = React.memo(function ArgumentCard({
  title,
  accentColor,
  points,
  summary,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        { borderColor: accentColor },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.star, { color: accentColor }]}>★</Text>
        <Text style={[styles.headerLabel, { color: accentColor }]}>
          {title}
        </Text>
      </View>

      {/* ── Numbered points ── */}
      {points.map((pt, idx) => (
        <View key={idx} style={idx > 0 ? styles.pointGap : undefined}>
          <Text style={styles.pointTitle}>
            {idx + 1}. {pt.title}
          </Text>
          {pt.bullets.map((b, bi) => (
            <Text key={bi} style={styles.bullet}>•  {b}</Text>
          ))}
        </View>
      ))}

      {/* ── Summary ── */}
      {summary ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.summaryLabel}>RESUMEN RÁPIDO</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </>
      ) : null}
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
  pointGap: {
    marginTop: PT.pointGap,
  },
  pointTitle: {
    color: PT.titleColor,
    fontSize: PT.titleSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  bullet: {
    color: PT.bulletColor,
    fontSize: PT.bulletSize,
    lineHeight: PT.bulletLineHeight,
    paddingLeft: PT.bulletIndent,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: SUM.dividerColor,
    marginVertical: SUM.dividerMarginVertical,
  },
  summaryLabel: {
    color: SUM.labelColor,
    fontSize: SUM.labelSize,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryText: {
    color: SUM.textColor,
    fontSize: SUM.textSize,
    lineHeight: SUM.textLineHeight,
  },
});
