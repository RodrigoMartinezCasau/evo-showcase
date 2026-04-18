import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
  DEBATE_HEADER_LAYOUT as HDR,
} from '@evoconn/constants/debateResponseLayout';
import { PHRASE_NOTES_LAYOUT as L } from '@evoconn/constants/phraseNotesLayout';
import { evoconnColors } from '@evoconn/theme/colors';
import WhiteStar from '../../assets/debate/whiteStar.svg';

const STAR_SZ = L.star.size * L.star.scale;
const HEADER_H = STAR_SZ;
const IC = SB.questionCard;

const starBoxStyle = {
  position: 'absolute' as const,
  left: L.star.offsetX,
  top: L.star.offsetY,
  width: STAR_SZ,
  height: STAR_SZ,
};

type Props = {
  /** Kept for API compatibility — outer colored border is no longer rendered. */
  borderColor?: string;
  /** Kept for API compatibility — outer colored border is no longer rendered. */
  borderWidth?: number;
  backgroundColor: string;
  value: string;
  onChangeText: (text: string) => void;
};

export const PhraseNotesCard = React.memo(function PhraseNotesCard({
  backgroundColor,
  value,
  onChangeText,
}: Props) {
  return (
    <View
      style={[
        styles.outerCard,
        {
          // NOTE: large colored outer border removed for cleaner integration
          // with the screen background. The lateral accent on the inner card
          // (`borderLeftWidth` / `borderLeftColor`) is preserved below so the
          // section still has a visible colored stripe.
          backgroundColor,
          minHeight: L.blockMinHeight,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={starBoxStyle}>
          <WhiteStar width={STAR_SZ} height={STAR_SZ} />
        </View>
        <View
          style={[
            styles.titleBox,
            { left: STAR_SZ + L.star.marginRight + L.title.offsetX },
          ]}
        >
          <Text
            style={[
              styles.titleText,
              {
                fontSize: L.title.fontSize,
                ...(L.title.lineHeight > 0 ? { lineHeight: L.title.lineHeight } : {}),
                marginTop: L.title.offsetY,
              },
            ]}
          >
            APUNTES DE FRASE
          </Text>
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
            marginLeft: IC.offsetX + L.content.offsetX,
            marginTop: IC.offsetY + L.content.offsetY,
            minHeight: L.content.minHeight,
          },
          IC.widthScale * L.content.widthScale < 1
            ? {
                alignSelf: 'center' as const,
                width: `${IC.widthScale * L.content.widthScale * 100}%` as unknown as number,
              }
            : undefined,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Tus notas privadas sobre esta frase…"
          placeholderTextColor={evoconnColors.muted}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            {
              fontSize: L.content.fontSize,
              ...(L.content.lineHeight > 0 ? { lineHeight: L.content.lineHeight } : {}),
              color: SB.questionText.color,
            },
          ]}
        />
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
  titleBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: '800',
    letterSpacing: HDR.letterSpacing,
    textTransform: 'uppercase',
    color: HDR.titleColor,
  },
  innerCard: {
    justifyContent: 'flex-start',
  },
  input: {
    flex: 1,
    minHeight: 80,
    padding: 0,
  },
});
