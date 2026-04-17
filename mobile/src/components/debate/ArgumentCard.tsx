import React, { useMemo } from 'react';
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

const BC = L.bodyContainer;
const PTs = L.pointTitles;
const PBs = L.pointBullets;
const SC = L.summaryContainer;
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
  const headerH = starSz;

  const starBoxStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: starLayout.offsetX,
      top: starLayout.offsetY,
      width: starSz,
      height: starSz,
    }),
    [starSz, starLayout.offsetX, starLayout.offsetY],
  );

  const titleBoxStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: starSz + starLayout.marginRight + dt.offsetX,
      top: 0,
      bottom: 0,
      justifyContent: 'center' as const,
    }),
    [starSz, starLayout.marginRight, dt.offsetX],
  );

  const titleTextStyle = useMemo(
    () => ({
      fontWeight: '800' as const,
      letterSpacing: HDR.letterSpacing,
      textTransform: 'uppercase' as const,
      color: HDR.titleColor,
      fontSize: dt.fontSize,
      ...(dt.lineHeight > 0 ? { lineHeight: dt.lineHeight } : {}),
      marginTop: dt.offsetY,
    }),
    [dt.fontSize, dt.lineHeight, dt.offsetY],
  );

  return (
    <View style={styles.card}>
      <View style={[styles.header, { height: headerH }]}>
        {StarIcon ? (
          <View style={starBoxStyle}>
            <StarIcon width={starSz} height={starSz} />
          </View>
        ) : (
          <Text
            style={[
              styles.starFallback,
              {
                position: 'absolute',
                left: starLayout.offsetX,
                top: starLayout.offsetY,
                fontSize: starSz,
              },
            ]}
          >
            ★
          </Text>
        )}
        <View style={titleBoxStyle}>
          <Text style={titleTextStyle}>{title}</Text>
        </View>
      </View>

      {/* Body container — movable as a group */}
      <View style={{ marginLeft: BC.offsetX, marginTop: BC.offsetY }}>
        {hasPoints ? (
          points.map((pt, idx) => (
            <View key={idx} style={idx > 0 ? styles.pointGap : undefined}>
              <Text
                style={[
                  styles.pointTitle,
                  {
                    fontSize: PTs.fontSize,
                    ...(PTs.lineHeight > 0 ? { lineHeight: PTs.lineHeight } : {}),
                    marginLeft: PTs.offsetX,
                    marginTop: PTs.offsetY,
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
                      marginLeft: PBs.offsetX + PT.bulletIndent,
                      marginTop: PBs.offsetY,
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
      </View>

      {/* Summary container — movable as a group */}
      {summary ? (
        <View style={{ marginLeft: SC.offsetX, marginTop: SC.offsetY }}>
          <View style={styles.divider} />
          <Text
            style={[
              styles.summaryLabel,
              {
                fontSize: SL.fontSize,
                ...(SL.lineHeight > 0 ? { lineHeight: SL.lineHeight } : {}),
                marginLeft: SL.offsetX,
                marginTop: SL.offsetY,
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
                marginLeft: SB.offsetX,
                marginTop: SB.offsetY,
              },
            ]}
          >
            {summary}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: CARD.paddingHorizontal,
    paddingVertical: CARD.paddingVertical,
    // No border, no background — content flows on the black screen background
  },
  header: {
    marginBottom: HDR.marginBottom,
  },
  starFallback: {
    color: '#FFFFFF',
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
