import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

type FeedbackWidgetProps = {
  onUp?: () => void;
  onDown?: () => void;
};

export function FeedbackWidget({ onUp, onDown }: FeedbackWidgetProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>¿Útil?</Text>
      <TouchableOpacity onPress={onUp} style={styles.btn}>
        <Text style={styles.thumb}>👍</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDown} style={styles.btn}>
        <Text style={styles.thumb}>👎</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  label: { color: evoconnColors.muted, fontSize: 12 },
  btn: { padding: 4 },
  thumb: { fontSize: 18 },
});
