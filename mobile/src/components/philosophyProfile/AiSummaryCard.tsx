/**
 * AI-generated philosophical summary of the current user.
 * Costs 1 use per generation / reload.
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { AiBlockCard, type AiBlockState } from './AiBlockCard';

type Props = {
  summary: string | null;
  state: AiBlockState;
  errorMessage?: string;
  onReload: () => void;
  usesAvailable?: boolean;
};

export const AiSummaryCard = React.memo(function AiSummaryCard({
  summary,
  state,
  errorMessage,
  onReload,
  usesAvailable = true,
}: Props) {
  return (
    <AiBlockCard
      title="Perfil filosófico"
      state={state}
      errorMessage={errorMessage}
      onReload={onReload}
      usesAvailable={usesAvailable}
    >
      {summary ? (
        <Text style={styles.body}>{summary}</Text>
      ) : (
        <Text style={styles.placeholder}>
          Pulsa ↻ para conocer detalles de tu pensamiento filosófico. 
        </Text>
      )}
    </AiBlockCard>
  );
});

const styles = StyleSheet.create({
  body: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  placeholder: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
