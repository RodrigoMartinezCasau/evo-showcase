/**
 * Local book recommendations — exactly 2 per reload, different authors,
 * never repeating previously shown books.
 *
 * The content block is centered inside the card and controlled by
 * layout constants from personalProfileLayout.ts.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AiBlockCard, type AiBlockState } from './AiBlockCard';
import type { BookRecord } from '@evoconn/data/books/bookDatabase';
import {
  RECOMMENDED_BOOKS_OFFSET_X,
  RECOMMENDED_BOOKS_OFFSET_Y,
  RECOMMENDED_BOOKS_SCALE,
  RECOMMENDED_BOOKS_ITEM_GAP,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  books: BookRecord[] | null;
  /** True when the entire available catalog has been exhausted. */
  exhausted?: boolean;
  state: AiBlockState;
  errorMessage?: string;
  onReload: () => void;
};

export const BookRecommendationsCard = React.memo(function BookRecommendationsCard({
  books,
  exhausted = false,
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
      {/* Exhausted — no more unique books available */}
      {exhausted ? (
        <View style={styles.exhaustedWrap}>
          <Text style={styles.exhaustedText}>
            Ya no quedan nuevas lecturas con tu perfil actual.
          </Text>
        </View>
      ) : books && books.length > 0 ? (
        /* ── Content block: centered, driven by layout constants ── */
        <View
          style={[
            styles.contentOuter,
            {
              transform: [
                { translateX: RECOMMENDED_BOOKS_OFFSET_X },
                { translateY: RECOMMENDED_BOOKS_OFFSET_Y },
                { scale: RECOMMENDED_BOOKS_SCALE },
              ],
            },
          ]}
        >
          <View style={[styles.list, { gap: RECOMMENDED_BOOKS_ITEM_GAP }]}>
            {books.map((b) => (
              <View key={b.id} style={styles.item}>
                <Text style={styles.bookIcon}>📖</Text>
                <View style={styles.textWrap}>
                  <Text style={styles.bookTitle}>{b.title}</Text>
                  <Text style={styles.bookAuthor}>{b.author}</Text>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>
                      {DIFFICULTY_LABEL[b.difficulty]}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* ── Idle placeholder ── */
        <Text style={styles.placeholder}>
          Pulsa ↻ para obtener recomendaciones de lectura.
        </Text>
      )}
    </AiBlockCard>
  );
});

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     'Introductorio',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
};

const styles = StyleSheet.create({
  contentOuter: {
    alignItems: 'center',
  },
  list: {
    width: '100%',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bookIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  bookTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  bookAuthor: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 15,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  difficultyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  placeholder: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  exhaustedWrap: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  exhaustedText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
  },
});
