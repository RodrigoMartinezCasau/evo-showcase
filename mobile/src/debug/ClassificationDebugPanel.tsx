/**
 * ClassificationDebugPanel
 *
 * Floating overlay that shows the real-time philosophical classification
 * state for the active simulated user.
 *
 * ONLY rendered when __DEV__ is true (see _layout.tsx).
 * Self-contained: remove 1 file + 1 line in _layout.tsx to delete entirely.
 *
 * What it shows:
 *   - Accumulated percentages per clan (sorted desc, top clan highlighted)
 *   - Raw scores of the last classified input
 *   - Last input text (truncated)
 *   - Reflection + phrase counts vs. reveal thresholds
 *   - Current visible clan status
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import {
  ALL_CLAN_IDS,
  CLAN_LABELS,
  type ClanScoreId,
} from '@evoconn/services/clanClassifier';
import {
  REVEAL_MIN_REFLECTIONS,
  REVEAL_TOTAL_INPUTS_THRESHOLD,
  REVEAL_PCT_THRESHOLD,
  REVEAL_LEAD_OVER_SECOND_PP,
} from '@evoconn/hooks/ClassificationContext';

// ─── Colour palette ──────────────────────────────────────────────────────────

const CLAN_COLOURS: Record<ClanScoreId, string> = {
  nihilista:        '#9B9B9B',
  cientista:        '#529da2',
  estoico:          '#81C784',
  existencialista:  '#CE93D8',
  racionalista:     '#FFD54F',
  humanista:        '#FF8A65',
  realista:         '#90A4AE',
  trascendentalista:'#8d61d1',
};

// ─── Small sub-components ────────────────────────────────────────────────────

function BarRow({
  label,
  pct,
  rawScore,
  colour,
  isTop,
}: {
  label: string;
  pct: number;
  rawScore: number;
  colour: string;
  isTop: boolean;
}) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <View style={[styles.dot, { backgroundColor: colour }]} />
        <Text style={[styles.barLabel, isTop && styles.barLabelTop]}>
          {isTop ? '▶ ' : '   '}
          {label}
        </Text>
        <Text style={[styles.barPct, isTop && styles.barLabelTop]}>
          {pct}%
        </Text>
        <Text style={styles.rawScore}>({rawScore.toFixed(2)})</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.min(pct, 100)}%` as `${number}%`, backgroundColor: colour }]}
        />
      </View>
    </View>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ClassificationDebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const sim = useSimulation();
  const classification = useClassification();
  const userId = sim.activeUserId;

  const userState = classification.getUserState(userId);
  const percentages = classification.getPercentages(userId);
  const reflections = classification.getReflectionCount(userId);
  const phrases = classification.getPhraseCount(userId);
  const totalInputs = reflections + phrases;
  const visibleClan = classification.getVisibleClanId(userId);

  // Build a pct lookup for the bar fill, including zero clans.
  const pctMap = useMemo<Record<ClanScoreId, number>>(() => {
    const map = {} as Record<ClanScoreId, number>;
    for (const c of ALL_CLAN_IDS) map[c] = 0;
    for (const entry of percentages) map[entry.clanId as ClanScoreId] = entry.pct;
    return map;
  }, [percentages]);

  // Last classified input record.
  const lastInput = userState.inputs.length > 0
    ? userState.inputs[userState.inputs.length - 1]
    : null;

  // Raw scores of the last input sorted desc for display.
  const lastRawSorted = useMemo(() => {
    if (!lastInput) return [];
    return ALL_CLAN_IDS
      .map((c) => ({ clan: c, score: lastInput.clanScores[c] }))
      .sort((a, b) => b.score - a.score);
  }, [lastInput]);

  // Top clan for highlight.
  const topClan = percentages.length > 0
    ? (percentages[0].clanId as ClanScoreId)
    : null;

  // Sorted by pct desc, zeros at the bottom.
  const sorted = useMemo(() =>
    ALL_CLAN_IDS
      .map((c) => ({ clan: c, pct: pctMap[c] }))
      .sort((a, b) => b.pct - a.pct),
  [pctMap]);

  const progressLabel = `${totalInputs} / ${REVEAL_TOTAL_INPUTS_THRESHOLD} total (${reflections} ref · ${phrases} frases)`;
  const progressRatio = Math.min(totalInputs / REVEAL_TOTAL_INPUTS_THRESHOLD, 1);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* ── Toggle button ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <Text style={styles.toggleIcon}>{expanded ? '✕' : '⚗'}</Text>
      </TouchableOpacity>

      {/* ── Panel body ────────────────────────────────────────────────── */}
      {expanded && (
        <View style={styles.panel}>
          {/* Header */}
          <Text style={styles.title}>Classifier Debug</Text>
          <Text style={styles.subtitle}>user: {userId}</Text>

          {/* Clan reveal status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Clan visible:</Text>
            <Text style={[styles.statusValue, visibleClan ? styles.clanRevealed : styles.clanHidden]}>
              {visibleClan ? CLAN_LABELS[visibleClan] : 'Sin clan'}
            </Text>
          </View>

          {/* Reflection progress bar */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Inputs revelación:</Text>
            <Text style={styles.statusValue}>{progressLabel}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` as `${number}%` }]} />
            <View style={[styles.progressThreshold]} />
          </View>
          <Text style={styles.thresholdNote}>
            ≥{REVEAL_MIN_REFLECTIONS} ref, ≥{REVEAL_TOTAL_INPUTS_THRESHOLD} total, líder ≥{REVEAL_PCT_THRESHOLD}%
            y +{REVEAL_LEAD_OVER_SECOND_PP} pp sobre el 2.º
          </Text>

          <View style={styles.divider} />

          {/* Accumulated percentages */}
          <Text style={styles.sectionTitle}>Distribución acumulada</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {sorted.map(({ clan, pct }) => (
              <BarRow
                key={clan}
                label={CLAN_LABELS[clan]}
                pct={pct}
                rawScore={userState.totals[clan]}
                colour={CLAN_COLOURS[clan]}
                isTop={clan === topClan}
              />
            ))}
          </ScrollView>

          {/* Last input */}
          {lastInput && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Último input</Text>
              <Text style={styles.inputMeta}>
                tipo: <Text style={styles.inputMetaVal}>{lastInput.inputType}</Text>
                {'  '}peso: <Text style={styles.inputMetaVal}>{lastInput.weight.toFixed(2)}</Text>
              </Text>

              {/* Raw scores of last input — blend S+ML+Claude, top-3 cap applied */}
              <Text style={styles.rawTitle}>Scores crudos (S + ML + Claude):</Text>
              {lastRawSorted.map(({ clan, score }) => (
                <View key={clan} style={styles.rawRow}>
                  <View style={[styles.dot, { backgroundColor: CLAN_COLOURS[clan] }]} />
                  <Text style={styles.rawRowLabel}>{CLAN_LABELS[clan]}</Text>
                  <Text style={styles.rawRowScore}>{score.toFixed(3)}</Text>
                  <View style={styles.rawTrack}>
                    <View
                      style={[
                        styles.rawFill,
                        {
                          width: `${Math.min((score / 10) * 100, 100)}%` as `${number}%`,
                          backgroundColor: CLAN_COLOURS[clan],
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              {/* Claude layer scores */}
              <Text style={[styles.rawTitle, styles.claudeTitle]}>
                {lastInput.claudeScores ? 'Capa Claude:' : 'Capa Claude: — (sin conexión)'}
              </Text>
              {lastInput.claudeScores
                ? ALL_CLAN_IDS
                    .map((c) => ({ clan: c, score: lastInput.claudeScores![c] ?? 0 }))
                    .sort((a, b) => b.score - a.score)
                    .map(({ clan, score }) => (
                      <View key={clan} style={styles.rawRow}>
                        <View style={[styles.dot, { backgroundColor: CLAN_COLOURS[clan] }]} />
                        <Text style={styles.rawRowLabel}>{CLAN_LABELS[clan]}</Text>
                        <Text style={styles.rawRowScore}>{score.toFixed(3)}</Text>
                        <View style={styles.rawTrack}>
                          <View
                            style={[
                              styles.rawFill,
                              {
                                width: `${Math.min((score / 10) * 100, 100)}%` as `${number}%`,
                                backgroundColor: '#B39DDB',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))
                : null}
            </>
          )}

          {userState.inputs.length === 0 && (
            <Text style={styles.emptyNote}>
              Aún no hay inputs clasificados para este usuario.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const PANEL_W = 280;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 12,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,30,40,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  toggleIcon: {
    fontSize: 18,
    color: '#fff',
  },
  panel: {
    width: PANEL_W,
    maxHeight: 560,
    backgroundColor: 'rgba(18,18,28,0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    width: 90,
  },
  statusValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  clanRevealed: {
    color: '#69f0ae',
  },
  clanHidden: {
    color: 'rgba(255,255,255,0.35)',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 3,
    marginBottom: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#69f0ae',
    borderRadius: 3,
  },
  progressThreshold: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  thresholdNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  scroll: {
    maxHeight: 200,
  },
  barRow: {
    marginBottom: 6,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  barLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    flex: 1,
  },
  barLabelTop: {
    color: '#fff',
    fontWeight: '700',
  },
  barPct: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
  rawScore: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    width: 44,
    textAlign: 'right',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    opacity: 0.8,
  },
  inputMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginBottom: 6,
  },
  inputMetaVal: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  rawTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginBottom: 5,
  },
  claudeTitle: {
    marginTop: 8,
    color: '#B39DDB',
  },
  rawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rawRowLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    flex: 1,
  },
  rawRowScore: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    width: 38,
    textAlign: 'right',
    marginRight: 6,
  },
  rawTrack: {
    width: 50,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  rawFill: {
    height: '100%',
    borderRadius: 2,
    opacity: 0.7,
  },
  emptyNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
