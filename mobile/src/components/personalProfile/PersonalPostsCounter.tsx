import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  totalReflections: number;
  totalQuotes: number;
};

export const PersonalPostsCounter = React.memo(function PersonalPostsCounter({
  totalReflections,
  totalQuotes,
}: Props) {
  const totalPosts = totalReflections + totalQuotes;

  return (
    <View style={styles.card}>
      <Text style={styles.value}>{totalPosts}</Text>
      <Text style={styles.label}>Publicaciones</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 120,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.4,
    opacity: 0.7,
  },
});
