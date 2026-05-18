/**
 * AI-generated list of the 3 philosophers most similar to the user.
 * Costs 1 use per generation / reload.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AiBlockCard, type AiBlockState } from './AiBlockCard';
import type { PhilosopherEntry } from '@evoconn/services/philosophyProfileApi';

type Props = {
  philosophers: PhilosopherEntry[] | null;
  state: AiBlockState;
  errorMessage?: string;
  onReload: () => void;
  usesAvailable?: boolean;
};

export const SimilarPhilosophersCard = React.memo(function SimilarPhilosophersCard({
  philosophers,
  state,
  errorMessage,
  onReload,
  usesAvailable = true,
}: Props) {
  return (
    <AiBlockCard
      title="Filósofos similares"
      state={state}
      errorMessage={errorMessage}
      onReload={onReload}
      usesAvailable={usesAvailable}
    >
      {philosophers && philosophers.length > 0 ? (
        <View style={styles.list}>
          {philosophers.slice(0, 3).map((p, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.rank}>
                <Text style={styles.rankNum}>{i + 1}</Text>
              </View>
              <Text style={styles.name}>{p.name}</Text>
              <View style={styles.pctWrap}>
                <View style={[styles.pctBar, { width: `${p.pct}%` }]} />
              </View>
              <Text style={styles.pct}>{p.pct}%</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.placeholder}>
          Pulsa ↻ para conocer los filósofos más similares a ti. 
        </Text>
      )}
    </AiBlockCard>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    width: 130,
  },
  pctWrap: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  pctBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  pct: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    width: 38,
    textAlign: 'right',
  },
  placeholder: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
