import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { DebateResponse } from '@evoconn/types/debate';
import { getClanColor, getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { DEBATE_CARD_LAYOUT } from '@evoconn/constants/debateResponseLayout';
import { ArgumentCard, type ArgumentPointData } from './ArgumentCard';
import { QuestionCard } from './QuestionCard';
import { DebateQuoteCard } from './DebateQuoteCard';
import { PublishBlock } from './PublishBlock';

type Props = {
  response: DebateResponse;
  clanId: string | null | undefined;
};

/**
 * Adapts a StructuredSection (from backend) into the flat
 * array of { title, bullets } that ArgumentCard expects.
 */
function sectionToPoints(
  section: DebateResponse['debate_layer']['stance_section'],
): ArgumentPointData[] {
  if (!section?.points?.length) return [];
  return section.points.map((p) => ({
    title: p.title,
    bullets: p.bullets.map((b) => b.text),
  }));
}

/**
 * Fallback: convert a plain-text steelman/contrarian string
 * into a single point with one bullet.
 */
function textToPoints(text: string | undefined): ArgumentPointData[] {
  if (!text) return [];
  return [{ title: 'Argumento', bullets: [text] }];
}

export const DebateResponseDisplay = React.memo(function DebateResponseDisplay({
  response,
  clanId,
}: Props) {
  const primaryColor = getClanColor(clanId);
  const secondaryColor = getClanSecondaryColor(clanId);

  const dl = response.debate_layer;

  const stancePoints = useMemo(
    () =>
      dl.stance_section
        ? sectionToPoints(dl.stance_section)
        : textToPoints(dl.steelman_of_user),
    [dl.stance_section, dl.steelman_of_user],
  );

  const counterPoints = useMemo(
    () =>
      dl.counter_section
        ? sectionToPoints(dl.counter_section)
        : textToPoints(dl.contrarian_position),
    [dl.counter_section, dl.contrarian_position],
  );

  const stanceSummary = dl.stance_section?.quick_summary;
  const counterSummary = dl.counter_section?.quick_summary;

  const questionText =
    dl.question_section?.socratic_question ??
    dl.socratic_questions?.[0] ??
    null;

  const firstQuote = response.author_layer?.quotes?.[0] ?? null;

  return (
    <View style={styles.wrapper}>
      {/* ── 1. TU POSTURA ── */}
      {stancePoints.length > 0 ? (
        <ArgumentCard
          title="TU POSTURA"
          accentColor={primaryColor}
          points={stancePoints}
          summary={stanceSummary}
        />
      ) : null}

      {/* ── 2. CONTRAPOSTURA ── */}
      {counterPoints.length > 0 ? (
        <ArgumentCard
          title="CONTRAPOSTURA"
          accentColor={secondaryColor}
          points={counterPoints}
          summary={counterSummary}
        />
      ) : null}

      {/* ── 3. PREGUNTA REFLEXIVA ── */}
      {questionText ? (
        <QuestionCard question={questionText} accentColor={primaryColor} />
      ) : null}

      {/* ── 4. CITA TEXTUAL ── */}
      {firstQuote ? (
        <DebateQuoteCard
          quote={firstQuote.quote}
          author={firstQuote.author}
          work={firstQuote.work}
        />
      ) : null}

      {/* ── 5. PUBLICAR ── */}
      <PublishBlock />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: DEBATE_CARD_LAYOUT.cardGap,
  },
});
