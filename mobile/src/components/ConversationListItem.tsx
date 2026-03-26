import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ConversationItem } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';

type ConversationListItemProps = {
  item: ConversationItem;
  onPress: () => void;
  onStarPress?: () => void;
  onPencilPress?: () => void;
};

export function ConversationListItem({ item, onPress, onStarPress, onPencilPress }: ConversationListItemProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row}>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity onPress={onStarPress} hitSlop={8}>
        <Text style={styles.icon}>{item.isFavorite ? '★' : '☆'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPencilPress} hitSlop={8}>
        <Text style={styles.icon}>✎</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  main: { flex: 1 },
  title: { color: evoconnColors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: evoconnColors.muted, fontSize: 12, marginTop: 2 },
  icon: { color: evoconnColors.muted, fontSize: 16, marginLeft: 12 },
});
