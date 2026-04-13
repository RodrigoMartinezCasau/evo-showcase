/**
 * AI-generated job/study recommendations based on the user's philosophical profile.
 * Costs 1 use per generation / reload.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AiBlockCard, type AiBlockState } from './AiBlockCard';
import type { JobEntry } from '@evoconn/services/philosophyProfileApi';

type Props = {
  jobs: JobEntry[] | null;
  state: AiBlockState;
  errorMessage?: string;
  onReload: () => void;
};

export const StudyRecommendationsCard = React.memo(function StudyRecommendationsCard({
  jobs,
  state,
  errorMessage,
  onReload,
}: Props) {
  return (
    <AiBlockCard
      title="Carreras y estudios"
      state={state}
      errorMessage={errorMessage}
      onReload={onReload}
    >
      {jobs && jobs.length > 0 ? (
        <View style={styles.list}>
          {jobs.map((j, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.bullet} />
              <View style={styles.textWrap}>
                <Text style={styles.jobTitle}>{j.title}</Text>
                <Text style={styles.jobReason}>{j.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.placeholder}>
          Pulsa ↻ para obtener recomendaciones de carrera. Cuesta 1 uso.
        </Text>
      )}
    </AiBlockCard>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  jobTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  jobReason: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 17,
  },
  placeholder: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
