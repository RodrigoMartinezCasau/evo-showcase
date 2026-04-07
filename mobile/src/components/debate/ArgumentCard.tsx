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
  title: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  /** Prose body text (new format). When present, rendered instead of points. */
  body?: string;
  /** Legacy numbered points format. */
  points?: ArgumentPointData[];
  summary?: string;
};

export const ArgumentCard = React.memo(function ArgumentCard({
  title,
  borderColor,
  borderWidth,
  backgroundColor,
  body,
  points,
  summary,
}: Props) {
  const hasBody = !!body && body.length > 0;

  return (
    <View style={[styles.card, { borderColor, borderWidth, backgroundColor }]}>
      <View style={styles.header}>
        <Text style={styles.star}>★</Text>
        <Text style={styles.headerLabel}>{title}</Text>
      </View>

      {hasBody ? (
        <Text style={styles.bodyText}>{body}</Text>
      ) : points?.length ? (
        points.map((pt, idx) => (
          <View key={idx} style={idx > 0 ? styles.pointGap : undefined}>
            <Text style={styles.pointTitle}>
              {idx + 1}. {pt.title}
            </Text>
            {pt.bullets.map((b, bi) => (
              <Text key={bi} style={styles.bullet}>•  {b}</Text>
            ))}
          </View>
        ))
      ) : null}

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
  bodyText: {
    color: '#D8D8D8',
    fontSize: 14,
    lineHeight: 22,
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
