import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

type QuoteCardProps = {
  quote: string;
  source?: string;
};

export function QuoteCard({ quote, source }: QuoteCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.quote}>"{quote}"</Text>
      {source && <Text style={styles.source}>— {source}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: evoconnColors.card,
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: evoconnColors.purple,
  },
  quote: { color: evoconnColors.text, fontStyle: 'italic', fontSize: 14, lineHeight: 20 },
  source: { color: evoconnColors.muted, fontSize: 12, marginTop: 6 },
});
