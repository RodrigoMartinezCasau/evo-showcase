/**
 * AI-generated book recommendations based on the user's philosophical profile.
 * Costs 1 use per generation / reload.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AiBlockCard, type AiBlockState } from './AiBlockCard';
import type { BookEntry } from '@evoconn/services/philosophyProfileApi';

type Props = {
  books: BookEntry[] | null;
  state: AiBlockState;
  errorMessage?: string;
  onReload: () => void;
};

export const BookRecommendationsCard = React.memo(function BookRecommendationsCard({
  books,
  state,
  errorMessage,
  onReload,
}: Props) {
  return (
    <AiBlockCard
      title="Lecturas recomendadas"
      state={state}
      errorMessage={errorMessage}
      onReload={onReload}
    >
      {books && books.length > 0 ? (
        <View style={styles.list}>
          {books.map((b, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.bookIcon}>📖</Text>
              <View style={styles.textWrap}>
                <Text style={styles.bookTitle}>{b.title}</Text>
                <Text style={styles.bookAuthor}>{b.author}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.placeholder}>
          Pulsa ↻ para obtener recomendaciones de lectura. 
        </Text>
      )}
    </AiBlockCard>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bookIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  bookTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bookAuthor: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 16,
  },
  placeholder: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
