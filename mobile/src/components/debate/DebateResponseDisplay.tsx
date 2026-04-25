import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DebateResponse, SelectedPhrase } from '@evoconn/types/debate';
import {
  AI_RESPONSE_LAYOUT as L,
  AI_RESPONSE_BLOCK_GAPS as GAPS,
  AI_RESPONSE_BORDER_WIDTH as BW,
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  getBlockBorderColor,
  getBlockBackgroundColor,
} from '@evoconn/constants/debateResponseLayout';
import {
  getPostureStarByClan,
  getCounterpointStarByClan,
} from '@evoconn/utils/getDebateStarByClan';
import { ArgumentCard, type ArgumentPointData } from './ArgumentCard';
import { QuestionCard } from './QuestionCard';
import { DebateQuoteCard } from './DebateQuoteCard';

type Props = {
  response: DebateResponse;
  clanId: string | null | undefined;
  /** Locally-selected phrase from our DB — shown instead of the backend AI quote. */
  selectedPhrase?: SelectedPhrase | null;
};

type SectionData = {
  body?: string;
  points: ArgumentPointData[];
  summary?: string;
};

function extractSection(
  section: DebateResponse['debate_layer']['stance_section'],
  fallbackText?: string,
): SectionData {
  if (section?.points?.length) {
    return {
      points: section.points.map((p) => ({
        title: p.title,
        bullets: p.bullets.map((b) => b.text),
      })),
      summary: section.quick_summary,
    };
  }
  if (section?.body && section.body.length >= 50) {
    return { body: section.body, points: [], summary: section.quick_summary };
  }
  if (fallbackText) {
    return { body: fallbackText, points: [] };
  }
  return { points: [] };
}

export const DebateResponseDisplay = React.memo(function DebateResponseDisplay({
  response,
  clanId,
  selectedPhrase,
}: Props) {
  const dl = response.debate_layer;

  const stance = useMemo(
    () => extractSection(dl.stance_section, dl.steelman_of_user),
    [dl.stance_section, dl.steelman_of_user],
  );

  const counter = useMemo(
    () => extractSection(dl.counter_section, dl.contrarian_position),
    [dl.counter_section, dl.contrarian_position],
  );

  const PostureStar = useMemo(() => getPostureStarByClan(clanId), [clanId]);
  const CounterpointStar = useMemo(() => getCounterpointStarByClan(clanId), [clanId]);

  const questionText =
    dl.question_section?.socratic_question ??
    dl.socratic_questions?.[0] ??
    null;

  // Only show our locally-selected DB phrase — never fall back to the backend AI quote.
  const displayQuote = selectedPhrase
    ? { quote: selectedPhrase.text, author: selectedPhrase.author, work: undefined, domainColor: selectedPhrase.domainColor }
    : null;

  const hasStance = !!stance.body || stance.points.length > 0;
  const hasCounter = !!counter.body || counter.points.length > 0;
  const hasQuestion = !!questionText;
  const hasQuote = !!displayQuote;

  /* ── Pregunta + Cita share height ── */
  const qaHeights = useRef({ question: 0, quote: 0 });
  const [qaSharedHeight, setQaSharedHeight] = useState<number | undefined>(undefined);
  const qaMeasured = useRef(0);

  const recalcQA = useCallback(() => {
    const h = qaHeights.current;
    const max = Math.max(h.question, h.quote, SB.baseMinHeight);
    setQaSharedHeight((prev) => (prev === max ? prev : max));
  }, []);

  const onQuestionMeasure = useCallback(
    (h: number) => {
      if (qaHeights.current.question !== h) {
        qaHeights.current.question = h;
        qaMeasured.current |= 1;
        if (qaMeasured.current === 3) recalcQA();
      }
    },
    [recalcQA],
  );

  const onQuoteMeasure = useCallback(
    (h: number) => {
      if (qaHeights.current.quote !== h) {
        qaHeights.current.quote = h;
        qaMeasured.current |= 2;
        if (qaMeasured.current === 3) recalcQA();
      }
    },
    [recalcQA],
  );

  const conversationalIntro = dl.conversational_intro ?? null;

  return (
    <View>
      {/* ── 0. INTRO CONVERSACIONAL ── */}
      {conversationalIntro ? (
        <Text style={styles.introText}>{conversationalIntro}</Text>
      ) : null}

      {/* ── 1. TU POSTURA ── */}
      {hasStance ? (
        <ArgumentCard
          title="TU POSTURA"
          borderColor={getBlockBorderColor('posture', clanId)}
          borderWidth={BW.posture}
          backgroundColor={getBlockBackgroundColor('posture', clanId)}
          body={stance.body}
          points={stance.points}
          summary={stance.summary}
          starIcon={PostureStar}
          starLayout={L.stars.posture}
          displayTitleLayout={L.displayTitles.posture}
        />
      ) : null}

      {/* ── 2. CONTRAPOSTURA ── */}
      {hasCounter ? (
        <View style={{ marginTop: GAPS.postureToCounterpoint }}>
          <ArgumentCard
            title="CONTRAPOSTURA"
            borderColor={getBlockBorderColor('counterpoint', clanId)}
            borderWidth={BW.counterpoint}
            backgroundColor={getBlockBackgroundColor('counterpoint', clanId)}
            body={counter.body}
            points={counter.points}
            summary={counter.summary}
            starIcon={CounterpointStar}
            starLayout={L.stars.counterpoint}
            displayTitleLayout={L.displayTitles.counterpoint}
          />
        </View>
      ) : null}

      {/* ── 3. PREGUNTA REFLEXIVA ── */}
      {hasQuestion ? (
        <View style={{ marginTop: GAPS.counterpointToQuestion }}>
          <QuestionCard
            question={questionText}
            unifiedHeight={qaSharedHeight}
            onMeasure={onQuestionMeasure}
          />
        </View>
      ) : null}

      {/* ── 4. CITA TEXTUAL ── */}
      {hasQuote && displayQuote ? (
        <View style={{ marginTop: GAPS.questionToQuote }}>
          <DebateQuoteCard
            quote={displayQuote.quote}
            author={displayQuote.author}
            work={displayQuote.work}
            domainColor={displayQuote.domainColor}
            unifiedHeight={qaSharedHeight}
            onMeasure={onQuoteMeasure}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  introText: {
    color: '#D8D8D8',
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
