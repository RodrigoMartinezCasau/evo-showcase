import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  /** Live count derived from the user's actual post list. */
  totalPosts: number;
  onPress?: () => void;
};

export const PersonalPostsCounter = React.memo(function PersonalPostsCounter({
  totalPosts,
  onPress,
}: Props) {

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={styles.value}>{totalPosts}</Text>
      <Text style={styles.label}>Publicaciones</Text>
    </TouchableOpacity>
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
