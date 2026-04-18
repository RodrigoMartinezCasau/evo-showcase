/**
 * Shared AI-phase animations used by BOTH reflection mode and phrase mode.
 *
 * Two pieces are exported:
 *
 * - `<ThinkingStar />`
 *     White "estrella comunidad" SVG that pulses in place while the AI is
 *     generating a response. Identical visual treatment in every flow so the
 *     app feels consistent (no per-screen spinners).
 *
 * - `<IntroTypewriter introText="…" />`
 *     Reveals a short conversational AI intro character-by-character with a
 *     typewriter effect. NO cursor, NO star riding the text — just the text
 *     appearing. Used for both the reflection intro and the phrase intro.
 *
 * The intent is that any screen needing the "AI thinking → AI intro typing →
 * full content" pattern can compose these two components and get the same
 * look/timing/UX, controlled centrally by the layout constants.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  AI_THINKING_STAR_LAYOUT as THINK_STAR,
  AI_INTRO_TYPING_LAYOUT as INTRO_TYPING,
} from '@evoconn/constants/chatInputBarLayout';
import EstrellaComunidadSvg from '../../assets/sidebar/estrellaComunidadSvg/estrellaComunidad.svg';

/** Pulsing white star shown while the AI is generating. */
export const ThinkingStar = React.memo(function ThinkingStar() {
  const pulse = useRef(new Animated.Value(THINK_STAR.thinkingStarMinScale)).current;
  useEffect(() => {
    const half = THINK_STAR.thinkingStarPulseDurationMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: THINK_STAR.thinkingStarMaxScale,
          duration: half,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: THINK_STAR.thinkingStarMinScale,
          duration: half,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.thinkingStarWrap}>
      <Animated.View
        style={{
          transform: [
            { translateX: THINK_STAR.thinkingStarOffsetX },
            { translateY: THINK_STAR.thinkingStarOffsetY },
            { scale: pulse },
          ],
        }}
      >
        <EstrellaComunidadSvg
          width={THINK_STAR.thinkingStarScale}
          height={THINK_STAR.thinkingStarScale}
        />
      </Animated.View>
    </View>
  );
});

/**
 * Reveals `introText` char-by-char with a typewriter effect. No visible cursor.
 * The reveal speed is governed by `AI_INTRO_TYPING_LAYOUT` so both reflection
 * and phrase intros animate at the same cadence.
 */
export const IntroTypewriter = React.memo(function IntroTypewriter({
  introText,
}: {
  introText: string;
}) {
  const [revealed, setRevealed] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!introText) {
      setRevealed('');
      return;
    }
    let pos = 0;
    const charsPerTick = Math.max(1, INTRO_TYPING.introTypingCharBatchSize);
    const msPerTick = Math.max(
      8,
      INTRO_TYPING.introTypingTickMs * INTRO_TYPING.introTypingDurationMultiplier,
    );
    timerRef.current = setInterval(() => {
      pos = Math.min(pos + charsPerTick, introText.length);
      setRevealed(introText.slice(0, pos));
      if (pos >= introText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, msPerTick);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [introText]);

  return <Text style={styles.introTypewriterText}>{revealed}</Text>;
});

/**
 * Helper to compute how long the typewriter will take for a given intro length,
 * matching the constants used inside `IntroTypewriter`. Useful when the parent
 * needs to schedule a state transition AFTER the typewriter finishes.
 */
export function computeIntroDurationMs(introText: string): number {
  const introLen = (introText || '').length;
  if (introLen === 0) return 0;
  const tickMs = Math.max(
    8,
    INTRO_TYPING.introTypingTickMs * INTRO_TYPING.introTypingDurationMultiplier,
  );
  const ticks = Math.ceil(introLen / Math.max(1, INTRO_TYPING.introTypingCharBatchSize));
  return Math.max(250, ticks * tickMs);
}

const styles = StyleSheet.create({
  thinkingStarWrap: {
    alignSelf: 'flex-start',
    marginVertical: 12,
    marginLeft: 4,
  },
  introTypewriterText: {
    color: evoconnColors.text,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.95,
  },
});
