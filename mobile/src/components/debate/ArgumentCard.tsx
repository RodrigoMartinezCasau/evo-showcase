import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { StarEditor, TextEditor } from '@evoconn/constants/debateResponseLayout';
import {
  AI_RESPONSE_LAYOUT as L,
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
  body?: string;
  points?: ArgumentPointData[];
  summary?: string;
  starIcon?: FC<SvgProps>;
  starLayout: StarEditor;
  displayTitleLayout: TextEditor;
};

const PTs = L.pointTitles;
const PBs = L.pointBullets;
const SL = L.summary.label;
const SB = L.summary.body;

export const ArgumentCard = React.memo(function ArgumentCard({
  title,
  borderColor,
  borderWidth,
  backgroundColor,
  body,
  points,
  summary,
  starIcon: StarIcon,
  starLayout,
  displayTitleLayout: dt,
}: Props) {
  const hasPoints = !!points && points.length > 0;
  const starSz = starLayout.size * starLayout.scale;

  return (
    <View style={[styles.card, { borderColor, borderWidth, backgroundColor }]}>
      <View style={styles.header}>
        {StarIcon ? (
          <View
            style={{
              width: starSz,
              height: starSz,
              marginRight: starLayout.marginRight,
              transform: [
                { translateX: starLayout.offsetX },
                { translateY: starLayout.offsetY },
              ],
            }}
          >
            <StarIcon width={starSz} height={starSz} />
          </View>
        ) : (
          <Text
            style={[
              styles.starFallback,
              {
                fontSize: starSz,
                marginRight: starLayout.marginRight,
                transform: [
                  { translateX: starLayout.offsetX },
                  { translateY: starLayout.offsetY },
                ],
              },
            ]}
          >
            ★
          </Text>
        )}
        <Text
          style={[
            styles.headerLabel,
            {
              fontSize: dt.fontSize,
              ...(dt.lineHeight > 0 ? { lineHeight: dt.lineHeight } : {}),
              transform: [
                { translateX: dt.offsetX },
                { translateY: dt.offsetY },
              ],
            },
          ]}
        >
          {title}
        </Text>
      </View>

      {hasPoints ? (
        points.map((pt, idx) => (
          <View key={idx} style={idx > 0 ? styles.pointGap : undefined}>
            <Text
              style={[
                styles.pointTitle,
                {
                  fontSize: PTs.fontSize,
                  ...(PTs.lineHeight > 0 ? { lineHeight: PTs.lineHeight } : {}),
                  transform: [
                    { translateX: PTs.offsetX },
                    { translateY: PTs.offsetY },
                  ],
                },
              ]}
            >
              {idx + 1}. {pt.title}
            </Text>
            {pt.bullets.map((b, bi) => (
              <Text
                key={bi}
                style={[
                  styles.bullet,
                  {
                    fontSize: PBs.fontSize,
                    lineHeight: PBs.lineHeight > 0 ? PBs.lineHeight : undefined,
                    transform: [
                      { translateX: PBs.offsetX },
                      { translateY: PBs.offsetY },
                    ],
                  },
                ]}
              >
                •  {b}
              </Text>
            ))}
          </View>
        ))
      ) : body && body.length > 0 ? (
        <Text style={styles.bodyText}>{body}</Text>
      ) : null}

      {summary ? (
        <>
          <View style={styles.divider} />
          <Text
            style={[
              styles.summaryLabel,
              {
                fontSize: SL.fontSize,
                ...(SL.lineHeight > 0 ? { lineHeight: SL.lineHeight } : {}),
                transform: [
                  { translateX: SL.offsetX },
                  { translateY: SL.offsetY },
                ],
              },
            ]}
          >
            RESUMEN RÁPIDO
          </Text>
          <Text
            style={[
              styles.summaryText,
              {
                fontSize: SB.fontSize,
                lineHeight: SB.lineHeight > 0 ? SB.lineHeight : undefined,
                transform: [
                  { translateX: SB.offsetX },
                  { translateY: SB.offsetY },
                ],
              },
            ]}
          >
            {summary}
          </Text>
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
  starFallback: {
    color: '#FFFFFF',
  },
  headerLabel: {
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
    fontWeight: '700',
    marginBottom: 4,
  },
  bullet: {
    color: PT.bulletColor,
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
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryText: {
    color: SUM.textColor,
  },
});
